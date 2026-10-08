// Keep shared projects accessible only to someone holding the exact share link.
// Query parameters and body :changed checks follow PocketBase API rule syntax.
migrate((app) => {
  const projects = app.findCollectionByNameOrId('projects');
  projects.listRule = '@request.auth.id != "" && owner = @request.auth.id || (is_public = true && share_token != "" && share_token = @request.query.share)';
  projects.viewRule = projects.listRule;
  projects.createRule = '@request.auth.id != "" && @request.body.owner = @request.auth.id';
  projects.updateRule = '@request.auth.id != "" && owner = @request.auth.id && @request.body.owner:changed = false';
  projects.deleteRule = '@request.auth.id != "" && owner = @request.auth.id';
  app.save(projects);
}, (app) => {
  // Preserve the stricter access rules on rollback; no project records are removed.
});
