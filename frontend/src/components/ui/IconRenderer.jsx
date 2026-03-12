import { cloneElement, createElement, isValidElement } from 'react';

const ICON_SIZES = Object.freeze({
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24
});

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(' ');

const resolveSize = (size) => {
  if (typeof size === 'number' && Number.isFinite(size)) {
    return size;
  }

  return ICON_SIZES[size] || ICON_SIZES.md;
};

const isMuiIconComponent = (Icon) => Icon?.muiName === 'SvgIcon';

export default function IconRenderer({
  icon: Icon,
  size = 'md',
  strokeWidth = 1.9,
  className,
  sx,
  ...rest
}) {
  if (!Icon) {
    return null;
  }

  const resolvedSize = resolveSize(size);
  const mergedClassName = joinClassNames('crm-icon', className);

  if (isValidElement(Icon)) {
    return cloneElement(Icon, {
      className: joinClassNames(Icon.props.className, mergedClassName),
      style: {
        width: resolvedSize,
        height: resolvedSize,
        ...(Icon.props.style || {})
      }
    });
  }

  if (isMuiIconComponent(Icon)) {
    return createElement(Icon, {
      fontSize: 'inherit',
      className: mergedClassName,
      sx: [{ fontSize: resolvedSize, width: resolvedSize, height: resolvedSize }, sx].filter(Boolean),
      ...rest
    });
  }

  return createElement(Icon, {
    size: resolvedSize,
    strokeWidth,
    className: mergedClassName,
    ...rest
  });
}

export { ICON_SIZES };
