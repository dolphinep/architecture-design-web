export interface DiagramPreset {
  id: string;
  name: string;
  description: string;
  category: 'RDS' | 'NoSQL';
  code: string;
}

export const DIAGRAM_PRESETS: DiagramPreset[] = [
  {
    id: 'ecommerce-rds',
    name: 'E-Commerce Platform (RDS)',
    description: 'Relational schema for products, categories, orders, order items, users, and payments.',
    category: 'RDS',
    code: `Table users {
  id integer [pk, increment]
  email varchar [not null, unique]
  password_hash varchar [not null]
  full_name varchar
  role varchar
  created_at timestamp
}

Table categories {
  id integer [pk, increment]
  name varchar [not null]
  slug varchar [unique]
  parent_id integer
}

Table products {
  id integer [pk, increment]
  category_id integer [not null]
  name varchar [not null]
  sku varchar [unique]
  price decimal
  stock_quantity integer
  created_at timestamp
}

Table orders {
  id integer [pk, increment]
  user_id integer [not null]
  status varchar [not null]
  total_amount decimal [not null]
  shipping_address text
  created_at timestamp
}

Table order_items {
  id integer [pk, increment]
  order_id integer [not null]
  product_id integer [not null]
  quantity integer [not null]
  unit_price decimal [not null]
}

Table payments {
  id integer [pk, increment]
  order_id integer [not null, unique]
  payment_method varchar [not null]
  transaction_ref varchar [unique]
  status varchar [not null]
  paid_at timestamp
}

Ref: products.category_id > categories.id
Ref: orders.user_id > users.id
Ref: order_items.order_id > orders.id
Ref: order_items.product_id > products.id
Ref: payments.order_id - orders.id
`,
  },
  {
    id: 'saas-billing',
    name: 'SaaS Auth & Subscriptions',
    description: 'Multi-tenant organization accounts, subscription plans, user memberships, and invoices.',
    category: 'RDS',
    code: `Table organizations {
  id integer [pk, increment]
  name varchar [not null]
  slug varchar [unique]
  plan_id integer [not null]
  created_at timestamp
}

Table users {
  id integer [pk, increment]
  email varchar [not null, unique]
  full_name varchar
  avatar_url varchar
  created_at timestamp
}

Table memberships {
  id integer [pk, increment]
  organization_id integer [not null]
  user_id integer [not null]
  role varchar [not null]
  joined_at timestamp
}

Table plans {
  id integer [pk, increment]
  name varchar [not null]
  price_monthly decimal [not null]
  max_members integer
  features text
}

Table invoices {
  id integer [pk, increment]
  organization_id integer [not null]
  stripe_invoice_id varchar [unique]
  amount_paid decimal [not null]
  status varchar [not null]
  invoice_date timestamp
}

Ref: organizations.plan_id > plans.id
Ref: memberships.organization_id > organizations.id
Ref: memberships.user_id > users.id
Ref: invoices.organization_id > organizations.id
`,
  },
  {
    id: 'social-network',
    name: 'Social Media Network',
    description: 'Users, posts, comments, likes, follower relationships, and hashtags.',
    category: 'RDS',
    code: `Table users {
  id integer [pk, increment]
  username varchar [not null, unique]
  email varchar [not null, unique]
  bio text
  created_at timestamp
}

Table posts {
  id integer [pk, increment]
  author_id integer [not null]
  content text [not null]
  image_url varchar
  likes_count integer
  created_at timestamp
}

Table comments {
  id integer [pk, increment]
  post_id integer [not null]
  author_id integer [not null]
  content text [not null]
  created_at timestamp
}

Table follows {
  follower_id integer [not null]
  following_id integer [not null]
  created_at timestamp
}

Table likes {
  user_id integer [not null]
  post_id integer [not null]
  created_at timestamp
}

Ref: posts.author_id > users.id
Ref: comments.post_id > posts.id
Ref: comments.author_id > users.id
Ref: follows.follower_id > users.id
Ref: follows.following_id > users.id
Ref: likes.user_id > users.id
Ref: likes.post_id > posts.id
`,
  },
  {
    id: 'nosql-document-store',
    name: 'NoSQL Document Model (Extensible)',
    description: 'Preview of non-relational / MongoDB style embedded document collections.',
    category: 'NoSQL',
    code: `Table UserProfiles {
  _id ObjectId [pk]
  email varchar [unique]
  authProvider string
  settings document
  updatedAt datetime
}

Table ActivityLogs {
  _id ObjectId [pk]
  userId string
  action string
  metadata json
  timestamp datetime
}

Ref: ActivityLogs.userId > UserProfiles._id
`,
  },
];
