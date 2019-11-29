export type EstimateData = {
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
  items?: {
    name: string,
    full_name: string,
    id: string
    type: string, // Inventory|Service
    quantity: number,
    price: number,
    amount: number,
    description: string,
  }[],
  tag_number?: string,
  expiration_date?: string,
  expiration_time?: string,
  employee_initials?: string,
  need_parts?: string,
  parts_in_inventory?: string,
};
