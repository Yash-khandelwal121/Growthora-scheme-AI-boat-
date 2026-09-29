function generateSchema(articleData) {
  const seo = articleData.seo || {};
  const article = articleData.article || {};
  const baseUrl = "https://growthora.co.in";
  const basePath = process.env.SCHEME_PAGE_BASE_PATH || "/govtschemes";
  // Trim trailing slash just in case
  const cleanBasePath = basePath.replace(/\/$/, "");
  
  const url = `${baseUrl}${cleanBasePath}/${seo.slug}`;
  const currentDate = new Date().toISOString().split('T')[0];

  const graph = [];

  // WebSite
  graph.push({
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    "url": baseUrl,
    "name": "Growthora"
  });

  // WebPage
  graph.push({
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    "url": url,
    "name": seo.metaTitle,
    "description": seo.metaDescription,
    "isPartOf": { "@id": `${baseUrl}/#website` }
  });

  // Article
  graph.push({
    "@type": "Article",
    "@id": `${url}#article`,
    "isPartOf": { "@id": `${url}#webpage` },
    "mainEntityOfPage": { "@id": `${url}#webpage` },
    "headline": article.h1 || seo.metaTitle,
    "description": seo.metaDescription,
    "datePublished": "2026-01-01",
    "dateModified": currentDate,
    "author": {
      "@type": "Organization",
      "name": "Growthora Editorial Team",
      "url": baseUrl
    },
    "publisher": {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      "name": "Growthora",
      "url": baseUrl
    }
  });

  // BreadcrumbList
  graph.push({
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Schemes",
        "item": `${baseUrl}${cleanBasePath}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.h1 || seo.metaTitle,
        "item": url
      }
    ]
  });

  const schemaObject = {
    "@context": "https://schema.org",
    "@graph": graph
  };

  const schemaScript = `<script type="application/ld+json">\n${JSON.stringify(schemaObject, null, 2)}\n</script>`;

  return { schemaObject, schemaScript };
}

module.exports = {
  generateSchema
};
