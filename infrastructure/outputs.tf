output "docs_website_endpoint" {
  value = scaleway_object_bucket_website_configuration.docs.website_endpoint
}

output "marketing_website_endpoint" {
  value = scaleway_object_bucket_website_configuration.marketing.website_endpoint
}

output "container_registry_endpoint" {
  value = scaleway_registry_namespace.main.endpoint
}
