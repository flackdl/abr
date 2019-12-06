export type Item = {
  id: string
  name: string,
  full_name: string,
  type: string, // Inventory|Service
  price: number,
  description: string,
  sku: string,
};
export type EstimateItem = {
  id: string
  name: string,
  full_name: string,
  type: string, // Inventory|Service
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
  address_line1?: string,
  address_line2?: string,
  city?: string,
  state?: string,
  zip?: string,
  main_concern?: string,
  bike_model?: string,
  assessments?: {
    [name: string]: string,
  },
  category_items?: CategoryItem[],
  tag_number?: string,
  expiration_date?: string,
  expiration_time?: string,
  employee_initials?: string,
  need_parts?: boolean,
  parts_in_inventory?: boolean,
  review_ok?: boolean,
  contact_method?: string,
  signature?: string,
  payment_option?: string,
  public_notes?: string,
  private_notes?: string,
};
