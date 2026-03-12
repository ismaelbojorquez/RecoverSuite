import { Parser } from 'expr-eval';

const sanitizeVarName = (key, index) =>
  `v_${index}_${key.replace(/[^a-zA-Z0-9_]/g, '_')}`;

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return numeric;
    }
    return trimmed;
  }

  return value;
};

const functions = {
  SUM: (...args) =>
    args.reduce((acc, val) => acc + (Number.isFinite(Number(val)) ? Number(val) : 0), 0),
  IF: (cond, a, b) => (cond ? a : b),
  ROUND: (x, n = 0) => {
    const factor = 10 ** Number(n || 0);
    return Math.round(Number(x) * factor) / factor;
  },
  MIN: (...args) => Math.min(...args.map((v) => Number(v))),
  MAX: (...args) => Math.max(...args.map((v) => Number(v))),
  LEN: (text) => (text === null || text === undefined ? 0 : String(text).length),
  LOWER: (text) => (text === null || text === undefined ? '' : String(text).toLowerCase()),
  UPPER: (text) => (text === null || text === undefined ? '' : String(text).toUpperCase()),
  CONCAT: (...args) => args.map((v) => (v === null || v === undefined ? '' : String(v))).join(''),
  REGEXMATCH: (text, pattern, flags = '') => {
    try {
      const re = new RegExp(pattern, flags);
      return re.test(String(text ?? ''));
    } catch {
      return false;
    }
  },
  REGEXEXTRACT: (text, pattern, flags = '') => {
    try {
      const re = new RegExp(pattern, flags);
      const match = String(text ?? '').match(re);
      if (!match) return null;
      return match[1] ?? match[0];
    } catch {
      return null;
    }
  }
};

const parser = new Parser({
  operators: {
    logical: true,
    comparison: true,
    additive: true,
    multiplicative: true,
    power: true,
    factorial: false
  }
});

export const extractDependencies = (expression = '') => {
  const deps = new Set();
  const placeholderRegex = /\{([^}]+)\}/g;
  let match;
  while ((match = placeholderRegex.exec(expression)) !== null) {
    const refKey = match[1].trim();
    if (refKey) deps.add(refKey);
  }
  return deps;
};

export const buildGraph = (calcFields) => {
  const graph = new Map(); // key -> set of dependencies
  calcFields.forEach((field) => {
    const expr = field.calc_expression || field.calcExpression || '';
    graph.set(field.key, extractDependencies(expr));
  });
  return graph;
};

export const topologicalSort = (graph) => {
  const inDegree = new Map();
  graph.forEach((deps, node) => {
    if (!inDegree.has(node)) inDegree.set(node, 0);
    deps.forEach((dep) => {
      inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
    });
  });

  const queue = [];
  inDegree.forEach((deg, node) => {
    if (deg === 0) queue.push(node);
  });

  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    const deps = graph.get(node) || new Set();
    deps.forEach((dep) => {
      inDegree.set(dep, inDegree.get(dep) - 1);
      if (inDegree.get(dep) === 0) {
        queue.push(dep);
      }
    });
  }

  const hasCycle = order.length !== graph.size;
  return { order, hasCycle };
};

export const evaluateCalculatedFields = (fields = [], dynamicValues = {}) => {
  const resultValues = {};
  const errors = {};

  // Seed with dynamic values
  Object.entries(dynamicValues || {}).forEach(([key, value]) => {
    resultValues[key] = value;
  });

  const calcFields = fields.filter(
    (field) => (field.value_type || field.valueType) === 'calculated'
  );

  const graph = buildGraph(calcFields);
  const { order, hasCycle } = topologicalSort(graph);

  if (hasCycle) {
    // Detect nodes in cycle: those with in-degree > 0
    graph.forEach((deps, node) => {
      if (!order.includes(node)) {
        errors[node] = 'Ciclo en dependencias de campos calculados';
        resultValues[node] = null;
      }
    });
  }

  // Build lookup for dynamic/previous values
  const getValue = (key) => (resultValues[key] !== undefined ? resultValues[key] : null);

  // To handle dependencies not in order list (cycles), still attempt evaluation if possible
  const evaluationList = [
    ...order,
    ...calcFields.map((f) => f.key).filter((k) => !order.includes(k))
  ];

  const fieldByKey = new Map(calcFields.map((f) => [f.key, f]));

  for (const key of evaluationList) {
    const field = fieldByKey.get(key);
    if (!field) continue;
    if (errors[key]) continue;

    const expressionRaw = field.calc_expression || field.calcExpression;
    if (!expressionRaw || !String(expressionRaw).trim()) {
      errors[key] = 'Expresión vacía para campo calculado';
      resultValues[key] = null;
      continue;
    }

    const deps = graph.get(key) || new Set();
    // Map {key} placeholders to safe variable names
    const varsMap = {};
    let normalizedExpr = String(expressionRaw);

    let idx = 0;
    deps.forEach((refKey) => {
      const safeVar = sanitizeVarName(refKey, idx);
      varsMap[refKey] = safeVar;
      idx += 1;
      const re = new RegExp(`\\{${refKey.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\}`, 'g');
      normalizedExpr = normalizedExpr.replace(re, safeVar);
    });

    const scope = { ...functions };
    Object.entries(varsMap).forEach(([refKey, safeVar]) => {
      scope[safeVar] = normalizeValue(getValue(refKey));
    });

    try {
      const expr = parser.parse(normalizedExpr);
      const value = expr.evaluate(scope);
      resultValues[key] = value;
    } catch (err) {
      errors[key] = err.message || 'Error al evaluar expresión';
      resultValues[key] = null;
    }
  }

  return { values: resultValues, errors };
};
