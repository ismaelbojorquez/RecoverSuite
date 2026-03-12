import ClientInfoWidget from './ClientInfoWidget.jsx';
import CreditsWidget from './CreditsWidget.jsx';
import BalancesWidget from './BalancesWidget.jsx';
import PaymentsWidget from './PaymentsWidget.jsx';
import GestionesWidget from './GestionesWidget.jsx';
import ContactsWidget from './ContactsWidget.jsx';
import NegotiationsWidget from './NegotiationsWidget.jsx';

const WidgetRegistry = {
  datos_cliente: ClientInfoWidget,
  creditos: CreditsWidget,
  saldos: BalancesWidget,
  pagos: PaymentsWidget,
  gestiones: GestionesWidget,
  contactos: ContactsWidget,
  negociaciones: NegotiationsWidget
};

export {
  ClientInfoWidget,
  CreditsWidget,
  BalancesWidget,
  PaymentsWidget,
  GestionesWidget,
  ContactsWidget,
  NegotiationsWidget,
  WidgetRegistry
};

export default WidgetRegistry;
