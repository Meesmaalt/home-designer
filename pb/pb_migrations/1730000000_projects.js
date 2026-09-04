/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    app.findCollectionByNameOrId("projects")
    console.log("[kodu] projects exists – skip")
    return
  } catch (e) {}

  const users = app.findCollectionByNameOrId("users")

  try {
    users.listRule = "id = @request.auth.id"
    users.viewRule = "id = @request.auth.id"
    users.createRule = ""
    users.updateRule = "id = @request.auth.id"
    users.deleteRule = "id = @request.auth.id"
    app.save(users)
  } catch (e) {
    console.log("[kodu] users rules:", e)
  }

  const projects = new Collection({
    id: "pbc_projects01",
    name: "projects",
    type: "base",
    listRule: "owner = @request.auth.id || is_public = true",
    viewRule: "owner = @request.auth.id || is_public = true",
    createRule: '@request.auth.id != ""',
    updateRule: "owner = @request.auth.id",
    deleteRule: "owner = @request.auth.id",
    fields: [
      { name: "name", type: "text", required: true, min: 1, max: 120 },
      {
        name: "owner",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true,
      },
      { name: "data", type: "json", required: true },
      { name: "share_token", type: "text", required: false, max: 64 },
      { name: "is_public", type: "bool", required: false },
      { name: "notes", type: "text", required: false, max: 2000 },
    ],
  })
  app.save(projects)
  console.log("[kodu] projects collection created")
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("projects"))
  } catch (e) {}
})
