export interface BaseCRUD {
  create: (newItem: any) => {}
  update: (itemId: string, newItem: any) => {}
  delete: (itemId: string) => {}
  get: (itemId: string) => {}
  listen: (itemId: string) => {}
}
