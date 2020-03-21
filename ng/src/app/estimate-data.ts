export type Item = {
  id: string,
  name: string,
  full_name: string,
  type: string, // inventory|service
  price: number,
  quantity_on_hand: number,
  description: string,
  sku: string,
};
export type InvoiceItem = {
  id: string,
  date: string,
  public_notes: string,
  private_notes: string,
  bike_model: string,
  items: Item[],
};
export type EstimateItem = {
  id: string,
  name: string,
  full_name: string,
  type: string, // inventory|service
  quantity: number,
  price: number,
  amount: number,
  description: string,
};
export type CategoryItem = {
  name: string,
  items: EstimateItem[],
};
export type EstimateData = {
  status?: string,
  crm?: string,
  customer_id?: number,
  first_name?: string,
  last_name?: string,
  email?: string,
  phone?: number,
  state?: string,
  zip?: string,
  main_concern?: string,
  bike_model?: string,
  invoices?: InvoiceItem[],
  category_items?: CategoryItem[],
  tag_number?: string,
  expiration_date?: string,
  expiration_time?: string,
  employee_initials?: string,
  waiting_on_approval?: boolean,
  need_parts?: boolean,
  parts_in_inventory?: boolean,
  waiting_on_customer_bring_parts?: boolean,
  contact_method?: string,
  signature?: string,
  payment_option?: string,
  public_notes?: string,
  private_notes?: string,
  discount_percent?: number,
  discount_applied_to_all?: boolean,
};
