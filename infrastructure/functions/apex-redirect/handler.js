// Apex redirect: https://mrgnl.eu/* -> https://www.mrgnl.eu/*
// Deployed as a Scaleway Serverless Function (see infrastructure/domain.tf).
// Edge Services cannot serve apex domains (subdomain-only); functions support
// apex hostnames via an ALIAS record with an auto-issued TLS certificate.
// ESM syntax: the node runtime wraps sources with "type": "module".
export const handle = async (event) => {
  const path = event.path || "/";
  return {
    statusCode: 301,
    headers: { Location: `https://www.mrgnl.eu${path}` },
    body: "",
  };
};
