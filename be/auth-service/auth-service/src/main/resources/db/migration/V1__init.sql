create table users (
  id           bigserial primary key,
  first_name   varchar(100) not null,
  last_name    varchar(100) not null,
  dob          date not null,
  doj          date not null,
  department   varchar(100) not null,
  manager      varchar(100) not null,
  role         varchar(50)  not null,
  contact_no   varchar(10)  not null,
  address      varchar(255) not null,
  pincode      varchar(6)   not null,
  email        varchar(255) not null unique,
  password_hash varchar(255) not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
