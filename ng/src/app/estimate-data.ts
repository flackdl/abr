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
  questionnaire?: {
    bike_model: string,
    qualities: {
      [name: string]: string,
    },
    services: {
      [name: string]: boolean,
    }
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
  // TODO - isn't this auto populated in qbo?
  // tag_number: string
};
