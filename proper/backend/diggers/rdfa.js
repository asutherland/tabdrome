
const NS_PRED = 'xmlns\\:v="http://rdf.data-vocabulary.org/#"';
const RDFa_DIGGER_SPECS = {
  breadcrumbs: {
    containerSelector: `ol[${NS_PRED}],ul[${NS_PRED}]`,
    itemSelector: '[typeof="v:Breadcrumb"]',
    // For the last breadcrumb that represents the current page, at least MDN
    // stashes the property=v:title directly on the <li> and there is no <a> or
    // rel="v:url".
    values: {
      url: {
        selector: '[rel="v:url"]',
        extract: 'href',
        fallbackAction: 'constant',
        fallbackValue: null
      },
      label: {
        selector: '[property="v:title"]',
        extract: 'text',
        fallbackAction: 'use-self',
        fallbackValue: null
      }
    }
  }
};
module.exports = RDFa_DIGGER_SPECS;
