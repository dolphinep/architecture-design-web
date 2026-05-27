import type { PatternCode } from "@/types/principle";

export const codeExamples: Record<string, PatternCode> = {

  // ─────────────────────────────────────────────────────────────────────────
  // REPOSITORY PATTERN
  // ─────────────────────────────────────────────────────────────────────────
  "repository-pattern": {
    projectStructure: `src/
├── domain/
│   └── user.ts                  # Entity — pure data + behaviour
├── ports/
│   └── user-repository.ts       # Interface (the contract)
├── adapters/
│   ├── pg-user-repository.ts    # Postgres implementation
│   └── in-memory-user-repo.ts   # Test / dev implementation
└── services/
    └── user-service.ts          # Business logic — depends on interface`,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ports/user-repository.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// adapters/pg-user-repository.ts
export class PgUserRepository implements UserRepository {
  constructor(private db: Pool) {}

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db.query(
      "SELECT id, email, name FROM users WHERE id = $1", [id]
    );
    return rows[0] ?? null;
  }

  async save(user: User): Promise<void> {
    await this.db.query(
      \`INSERT INTO users(id, email, name) VALUES($1,$2,$3)
       ON CONFLICT(id) DO UPDATE SET email=$2, name=$3\`,
      [user.id, user.email, user.name]
    );
  }
}

// services/user-service.ts — depends on interface, not implementation
export class UserService {
  constructor(private repo: UserRepository) {}

  async changeEmail(id: string, newEmail: string): Promise<void> {
    const user = await this.repo.findById(id);
    if (!user) throw new Error("User not found");
    user.email = newEmail;
    await this.repo.save(user);
  }
}

// bootstrap: swap PgUserRepository for InMemoryUserRepo in tests
const repo = new PgUserRepository(pool);
const service = new UserService(repo);`,
      },
      {
        language: "go",
        label: "Go",
        code: `// ports/user_repository.go
type UserRepository interface {
	FindByID(ctx context.Context, id string) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	Save(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
}

// adapters/pg_user_repository.go
type PgUserRepository struct{ db *sql.DB }

func (r *PgUserRepository) FindByID(ctx context.Context, id string) (*User, error) {
	u := &User{}
	err := r.db.QueryRowContext(ctx,
		"SELECT id, email, name FROM users WHERE id=$1", id,
	).Scan(&u.ID, &u.Email, &u.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return u, err
}

func (r *PgUserRepository) Save(ctx context.Context, u *User) error {
	_, err := r.db.ExecContext(ctx,
		\`INSERT INTO users(id,email,name) VALUES($1,$2,$3)
		 ON CONFLICT(id) DO UPDATE SET email=$2, name=$3\`,
		u.ID, u.Email, u.Name,
	)
	return err
}

// services/user_service.go
type UserService struct{ repo UserRepository }

func (s *UserService) ChangeEmail(ctx context.Context, id, email string) error {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil { return err }
	if user == nil { return errors.New("user not found") }
	user.Email = email
	return s.repo.Save(ctx, user)
}`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// ports/user_repository.rs
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<User>>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>>;
    async fn save(&self, user: &User) -> Result<()>;
    async fn delete(&self, id: &str) -> Result<()>;
}

// adapters/pg_user_repository.rs
pub struct PgUserRepository { pool: PgPool }

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn find_by_id(&self, id: &str) -> Result<Option<User>> {
        sqlx::query_as!(User,
            "SELECT id, email, name FROM users WHERE id = $1", id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(Into::into)
    }

    async fn save(&self, user: &User) -> Result<()> {
        sqlx::query!(
            "INSERT INTO users(id,email,name) VALUES($1,$2,$3)
             ON CONFLICT(id) DO UPDATE SET email=$2, name=$3",
            user.id, user.email, user.name
        )
        .execute(&self.pool).await?;
        Ok(())
    }
}

// services/user_service.rs — generic over any UserRepository impl
pub struct UserService<R: UserRepository> { repo: R }

impl<R: UserRepository> UserService<R> {
    pub async fn change_email(&self, id: &str, new_email: &str) -> Result<()> {
        let mut user = self.repo.find_by_id(id).await?
            .ok_or_else(|| anyhow!("user not found"))?;
        user.email = new_email.to_string();
        self.repo.save(&user).await
    }
}`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DEPENDENCY INJECTION
  // ─────────────────────────────────────────────────────────────────────────
  "dependency-injection": {
    projectStructure: `src/
├── interfaces/
│   ├── email-service.ts         # Contract
│   └── payment-service.ts
├── services/
│   ├── smtp-email.service.ts    # Production implementation
│   ├── mock-email.service.ts    # Test / dev implementation
│   └── order-service.ts        # Depends on interfaces
├── container.ts                 # Wire all dependencies once
└── app.ts                       # Entry point — use container`,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// interfaces/email-service.ts
export interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

// services/smtp-email.service.ts — production
export class SmtpEmailService implements EmailService {
  constructor(private config: SmtpConfig) {}
  async send(to: string, subject: string, body: string) {
    await nodemailer.createTransport(this.config)
      .sendMail({ to, subject, html: body });
  }
}

// services/mock-email.service.ts — testing
export class MockEmailService implements EmailService {
  readonly sent: Array<{ to: string; subject: string }> = [];
  async send(to: string, subject: string) {
    this.sent.push({ to, subject });   // no network, inspect in tests
  }
}

// services/order-service.ts — receives dependencies, doesn't create them
export class OrderService {
  constructor(
    private repo: OrderRepository,
    private email: EmailService,   // ← interface, not SmtpEmailService
  ) {}

  async placeOrder(order: NewOrder): Promise<string> {
    const saved = await this.repo.save(order);
    await this.email.send(
      order.customerEmail, "Order confirmed", \`Order \${saved.id} placed.\`
    );
    return saved.id;
  }
}

// container.ts — single place that knows about concrete classes
const email   = new SmtpEmailService(config.smtp);
const repo    = new PgOrderRepository(db);
export const orderService = new OrderService(repo, email);`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go uses interfaces naturally — no DI framework needed
type EmailService interface {
	Send(ctx context.Context, to, subject, body string) error
}

// smtp_email.go — production
type SmtpEmailService struct{ dialer *gomail.Dialer }

func (s *SmtpEmailService) Send(ctx context.Context, to, subject, body string) error {
	m := gomail.NewMessage()
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)
	return s.dialer.DialAndSend(m)
}

// order_service.go — constructor injection (idiomatic Go)
type OrderService struct {
	repo  OrderRepository
	email EmailService    // ← interface
}

func NewOrderService(repo OrderRepository, email EmailService) *OrderService {
	return &OrderService{repo: repo, email: email}
}

func (s *OrderService) PlaceOrder(ctx context.Context, order *Order) (string, error) {
	saved, err := s.repo.Save(ctx, order)
	if err != nil { return "", err }
	err = s.email.Send(ctx, order.CustomerEmail, "Order confirmed", "Your order is placed.")
	return saved.ID, err
}

// main.go — wire up once at startup
dialer   := gomail.NewDialer(cfg.Host, cfg.Port, cfg.User, cfg.Pass)
emailSvc := &SmtpEmailService{dialer: dialer}
orderSvc := NewOrderService(NewPgOrderRepo(db), emailSvc)`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust DI via trait objects (dynamic) or generics (static/zero-cost)
#[async_trait]
pub trait EmailService: Send + Sync {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<()>;
}

// smtp_email.rs — production
pub struct SmtpEmailService { transport: AsyncSmtpTransport<Tokio1Executor> }

#[async_trait]
impl EmailService for SmtpEmailService {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<()> {
        let email = Message::builder().to(to.parse()?)
            .subject(subject).body(body.to_string())?;
        self.transport.send(email).await?;
        Ok(())
    }
}

// order_service.rs — generic over E: EmailService (zero-cost, monomorphised)
pub struct OrderService<R: OrderRepository, E: EmailService> {
    repo: R,
    email: E,
}

impl<R: OrderRepository, E: EmailService> OrderService<R, E> {
    pub fn new(repo: R, email: E) -> Self { Self { repo, email } }

    pub async fn place_order(&self, order: NewOrder) -> Result<String> {
        let saved = self.repo.save(&order).await?;
        self.email.send(
            &order.customer_email, "Order confirmed",
            &format!("Order {} placed.", saved.id)
        ).await?;
        Ok(saved.id)
    }
}

// main.rs — wire at startup
let email_svc  = SmtpEmailService::new(&config.smtp)?;
let order_repo = PgOrderRepository::new(pool.clone());
let order_svc  = OrderService::new(order_repo, email_svc);`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HEXAGONAL ARCHITECTURE
  // ─────────────────────────────────────────────────────────────────────────
  "hexagonal-architecture": {
    projectStructure: `src/
├── domain/                      # Core — ZERO external dependencies
│   ├── order.ts                 # Entity + domain rules
│   └── order-service.ts        # Orchestrates domain logic
├── ports/
│   ├── in/                      # Driving ports (what callers use)
│   │   └── place-order.port.ts
│   └── out/                     # Driven ports (what domain needs)
│       ├── order-repository.port.ts
│       └── notification.port.ts
└── adapters/
    ├── http/                    # Driving adapter — calls domain
    │   └── order-controller.ts
    └── db/                      # Driven adapter — called by domain
        └── pg-order-repository.ts`,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ports/in/place-order.port.ts — what the outside world calls
export interface PlaceOrderUseCase {
  execute(cmd: PlaceOrderCommand): Promise<string>;
}

// ports/out/order-repository.port.ts — what the domain needs
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

// domain/order-service.ts — pure logic, imports nothing external
export class OrderService implements PlaceOrderUseCase {
  constructor(private repo: OrderRepository) {}  // ← driven port

  async execute(cmd: PlaceOrderCommand): Promise<string> {
    const order = Order.create(cmd.customerId, cmd.items);
    order.validate();           // domain rule — throws if invalid
    await this.repo.save(order);
    return order.id;
  }
}

// adapters/http/order-controller.ts — driving adapter
export class OrderController {
  constructor(private useCase: PlaceOrderUseCase) {}  // ← driving port

  async post(req: Request): Promise<Response> {
    const id = await this.useCase.execute(req.body);
    return Response.json({ orderId: id }, { status: 201 });
  }
}

// adapters/db/pg-order-repository.ts — driven adapter
export class PgOrderRepository implements OrderRepository {
  async save(order: Order)           { /* SQL INSERT */ }
  async findById(id: string)         { /* SQL SELECT */ }
}

// bootstrap: plug adapters into the hex
const repo       = new PgOrderRepository(db);
const service    = new OrderService(repo);        // domain + driven
const controller = new OrderController(service);  // driving + domain`,
      },
      {
        language: "go",
        label: "Go",
        code: `// ports/in/place_order.go — driving port
type PlaceOrderUseCase interface {
	Execute(ctx context.Context, cmd PlaceOrderCommand) (string, error)
}

// ports/out/order_repository.go — driven port
type OrderRepository interface {
	Save(ctx context.Context, order *Order) error
	FindByID(ctx context.Context, id string) (*Order, error)
}

// domain/order_service.go — pure business logic, no framework imports
type OrderService struct{ repo OrderRepository }

func (s *OrderService) Execute(ctx context.Context, cmd PlaceOrderCommand) (string, error) {
	order := NewOrder(cmd.CustomerID, cmd.Items)
	if err := order.Validate(); err != nil {
		return "", err  // domain rule violation
	}
	return order.ID, s.repo.Save(ctx, order)
}

// adapters/http/order_handler.go — driving adapter
type OrderHandler struct{ uc PlaceOrderUseCase }

func (h *OrderHandler) Post(w http.ResponseWriter, r *http.Request) {
	var cmd PlaceOrderCommand
	json.NewDecoder(r.Body).Decode(&cmd)
	id, err := h.uc.Execute(r.Context(), cmd)
	if err != nil { http.Error(w, err.Error(), 500); return }
	json.NewEncoder(w).Encode(map[string]string{"orderId": id})
}

// adapters/db/pg_order_repo.go — driven adapter
type PgOrderRepo struct{ db *sql.DB }
func (r *PgOrderRepo) Save(ctx context.Context, o *Order) error   { /* SQL */ return nil }
func (r *PgOrderRepo) FindByID(ctx context.Context, id string) (*Order, error) { /* SQL */ return nil, nil }`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// ports/in/place_order.rs — driving port (input)
#[async_trait]
pub trait PlaceOrderUseCase: Send + Sync {
    async fn execute(&self, cmd: PlaceOrderCommand) -> Result<String>;
}

// ports/out/order_repository.rs — driven port (output)
#[async_trait]
pub trait OrderRepository: Send + Sync {
    async fn save(&self, order: &Order) -> Result<()>;
    async fn find_by_id(&self, id: &str) -> Result<Option<Order>>;
}

// domain/order_service.rs — no framework, no I/O, pure logic
pub struct OrderService<R: OrderRepository> { repo: R }

#[async_trait]
impl<R: OrderRepository + Send + Sync> PlaceOrderUseCase for OrderService<R> {
    async fn execute(&self, cmd: PlaceOrderCommand) -> Result<String> {
        let order = Order::new(cmd.customer_id, cmd.items)?;  // validates inline
        self.repo.save(&order).await?;
        Ok(order.id)
    }
}

// adapters/http/order_handler.rs — driving adapter (Axum)
pub async fn place_order(
    State(uc): State<Arc<dyn PlaceOrderUseCase>>,
    Json(cmd): Json<PlaceOrderCommand>,
) -> impl IntoResponse {
    match uc.execute(cmd).await {
        Ok(id)  => (StatusCode::CREATED, Json(json!({ "orderId": id }))).into_response(),
        Err(e)  => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// adapters/db/pg_order_repo.rs — driven adapter
pub struct PgOrderRepo { pool: PgPool }
#[async_trait]
impl OrderRepository for PgOrderRepo {
    async fn save(&self, order: &Order) -> Result<()>               { /* sqlx */ Ok(()) }
    async fn find_by_id(&self, id: &str) -> Result<Option<Order>>   { /* sqlx */ Ok(None) }
}`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STRATEGY PATTERN
  // ─────────────────────────────────────────────────────────────────────────
  "strategy-pattern": {
    projectStructure: `src/
├── strategies/
│   ├── pricing-strategy.ts      # Interface / contract
│   ├── standard-pricing.ts      # Regular customers
│   ├── premium-pricing.ts       # Subscribers — 20% off
│   └── bulk-pricing.ts          # Volume discounts
└── checkout-service.ts          # Context — holds and uses the strategy`,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// strategies/pricing-strategy.ts
export interface PricingStrategy {
  calculate(basePrice: number, quantity: number): number;
}

// strategies/standard-pricing.ts
export class StandardPricing implements PricingStrategy {
  calculate(basePrice: number, quantity: number): number {
    return basePrice * quantity;
  }
}

// strategies/premium-pricing.ts
export class PremiumPricing implements PricingStrategy {
  constructor(private discountRate = 0.2) {}
  calculate(basePrice: number, quantity: number): number {
    return basePrice * quantity * (1 - this.discountRate);
  }
}

// strategies/bulk-pricing.ts
export class BulkPricing implements PricingStrategy {
  calculate(basePrice: number, quantity: number): number {
    const discount = quantity >= 100 ? 0.3 : quantity >= 50 ? 0.15 : 0;
    return basePrice * quantity * (1 - discount);
  }
}

// checkout-service.ts — Context: holds strategy, delegates to it
export class CheckoutService {
  constructor(private pricing: PricingStrategy) {}

  // swap strategy without changing any other code
  setPricing(strategy: PricingStrategy) {
    this.pricing = strategy;
  }

  quote(basePrice: number, quantity: number): number {
    return this.pricing.calculate(basePrice, quantity);
  }
}

// usage — swap at runtime based on customer type
const checkout = new CheckoutService(new StandardPricing());

if (customer.isPremium) checkout.setPricing(new PremiumPricing());
if (order.quantity > 50)  checkout.setPricing(new BulkPricing());

const total = checkout.quote(29.99, order.quantity);`,
      },
      {
        language: "go",
        label: "Go",
        code: `// In Go, strategies are cleanly expressed as function types or interfaces.
// Function type approach — lightweight, no boilerplate:

type PricingStrategy func(basePrice float64, quantity int) float64

func StandardPricing(price float64, qty int) float64 {
	return price * float64(qty)
}

func PremiumPricing(price float64, qty int) float64 {
	return price * float64(qty) * 0.80  // 20% discount
}

func BulkPricing(price float64, qty int) float64 {
	discount := 0.0
	switch {
	case qty >= 100: discount = 0.30
	case qty >= 50:  discount = 0.15
	}
	return price * float64(qty) * (1 - discount)
}

// Context — holds and uses the strategy
type CheckoutService struct {
	pricing PricingStrategy
}

func (c *CheckoutService) SetPricing(s PricingStrategy) { c.pricing = s }

func (c *CheckoutService) Quote(basePrice float64, quantity int) float64 {
	return c.pricing(basePrice, quantity)
}

// Usage
svc := &CheckoutService{pricing: StandardPricing}

if customer.IsPremium   { svc.SetPricing(PremiumPricing) }
if order.Quantity > 50  { svc.SetPricing(BulkPricing) }

total := svc.Quote(29.99, order.Quantity)`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Strategy as trait — swap at runtime via trait objects
pub trait PricingStrategy: Send + Sync {
    fn calculate(&self, base_price: f64, quantity: u32) -> f64;
}

pub struct StandardPricing;
impl PricingStrategy for StandardPricing {
    fn calculate(&self, base_price: f64, quantity: u32) -> f64 {
        base_price * quantity as f64
    }
}

pub struct PremiumPricing { discount: f64 }
impl PricingStrategy for PremiumPricing {
    fn calculate(&self, base_price: f64, quantity: u32) -> f64 {
        base_price * quantity as f64 * (1.0 - self.discount)
    }
}

pub struct BulkPricing;
impl PricingStrategy for BulkPricing {
    fn calculate(&self, base_price: f64, quantity: u32) -> f64 {
        let discount = match quantity {
            q if q >= 100 => 0.30,
            q if q >= 50  => 0.15,
            _             => 0.00,
        };
        base_price * quantity as f64 * (1.0 - discount)
    }
}

// Context — Box<dyn Trait> allows runtime strategy swap
pub struct CheckoutService {
    pricing: Box<dyn PricingStrategy>,
}

impl CheckoutService {
    pub fn new(pricing: impl PricingStrategy + 'static) -> Self {
        Self { pricing: Box::new(pricing) }
    }
    pub fn set_pricing(&mut self, s: impl PricingStrategy + 'static) {
        self.pricing = Box::new(s);
    }
    pub fn quote(&self, base_price: f64, quantity: u32) -> f64 {
        self.pricing.calculate(base_price, quantity)
    }
}`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OBSERVER PATTERN
  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // OOP FUNDAMENTALS
  // ─────────────────────────────────────────────────────────────────────────
  "encapsulation": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `class BankAccount {
  #balance = 0;

  deposit(amount: number): void {
    if (amount <= 0) throw new RangeError("Amount must be positive");
    this.#balance += amount;
  }

  withdraw(amount: number): void {
    if (amount > this.#balance) throw new RangeError("Insufficient funds");
    this.#balance -= amount;
  }

  get balance(): number {
    return this.#balance;
  }
}

const account = new BankAccount();
account.deposit(100);
account.withdraw(30);
console.log(account.balance); // 70
// account.#balance = 9999; // ❌ SyntaxError — private field`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go
package bank

import (
  "errors"
  "fmt"
)

type BankAccount struct {
  balance float64 // unexported — private to this package
}

func (a *BankAccount) Deposit(amount float64) error {
  if amount <= 0 {
    return errors.New("amount must be positive")
  }
  a.balance += amount
  return nil
}

func (a *BankAccount) Withdraw(amount float64) error {
  if amount > a.balance {
    return fmt.Errorf("insufficient funds: have %.2f, want %.2f", a.balance, amount)
  }
  a.balance -= amount
  return nil
}

func (a *BankAccount) Balance() float64 {
  return a.balance
}`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust
pub struct BankAccount {
  balance: f64, // private by default
}

impl BankAccount {
  pub fn new() -> Self {
    Self { balance: 0.0 }
  }

  pub fn deposit(&mut self, amount: f64) -> Result<(), String> {
    if amount <= 0.0 {
      return Err("Amount must be positive".into());
    }
    self.balance += amount;
    Ok(())
  }

  pub fn withdraw(&mut self, amount: f64) -> Result<(), String> {
    if amount > self.balance {
      return Err(format!("Insufficient funds: have {:.2}", self.balance));
    }
    self.balance -= amount;
    Ok(())
  }

  pub fn balance(&self) -> f64 {
    self.balance
  }
}`,
      },
    ],
  },

  "abstraction": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `interface Logger {
  info(message: string): void;
  error(message: string, err?: unknown): void;
}

class ConsoleLogger implements Logger {
  info(message: string)               { console.log(\`[INFO]  \${message}\`); }
  error(message: string, err?: unknown) { console.error(\`[ERROR] \${message}\`, err); }
}

class SilentLogger implements Logger {
  info()  {}
  error() {}
}

// Business logic depends only on the abstraction
async function processOrder(logger: Logger, orderId: string): Promise<void> {
  logger.info(\`Processing order \${orderId}\`);
  // ... order logic
  logger.info(\`Order \${orderId} complete\`);
}

// Swap in a silent logger for tests — no console noise, same code path
await processOrder(new SilentLogger(), "ord_123");`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go
package log

import (
  "fmt"
  "os"
)

type Logger interface {
  Info(message string)
  Error(message string, err error)
}

type ConsoleLogger struct{}

func (l *ConsoleLogger) Info(message string) {
  fmt.Printf("[INFO]  %s\\n", message)
}

func (l *ConsoleLogger) Error(message string, err error) {
  fmt.Fprintf(os.Stderr, "[ERROR] %s: %v\\n", message, err)
}

type SilentLogger struct{}

func (l *SilentLogger) Info(string)        {}
func (l *SilentLogger) Error(string, error) {}

// Only the abstraction crosses the boundary
func ProcessOrder(logger Logger, orderID string) {
  logger.Info("Processing order " + orderID)
  // ... order logic
  logger.Info("Order " + orderID + " complete")
}`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust
pub trait Logger: Send + Sync {
  fn info(&self, message: &str);
  fn error(&self, message: &str, err: Option<Box<dyn std::error::Error>>);
}

pub struct ConsoleLogger;

impl Logger for ConsoleLogger {
  fn info(&self, message: &str) { println!("[INFO]  {}", message); }
  fn error(&self, message: &str, err: Option<Box<dyn std::error::Error>>) {
    eprintln!("[ERROR] {}: {:?}", message, err);
  }
}

pub struct SilentLogger;

impl Logger for SilentLogger {
  fn info(&self, _: &str) {}
  fn error(&self, _: &str, _: Option<Box<dyn std::error::Error>>) {}
}

pub async fn process_order(logger: &dyn Logger, order_id: &str) {
  logger.info(&format!("Processing order {}", order_id));
  // ... order logic
  logger.info(&format!("Order {} complete", order_id));
}`,
      },
    ],
  },

  "polymorphism": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `interface PaymentProcessor {
  charge(amount: number, currency: string): Promise<string>;
}

class StripeProcessor implements PaymentProcessor {
  async charge(amount: number, currency: string): Promise<string> {
    // Stripe API call
    return \`stripe_txn_\${Date.now()}\`;
  }
}

class PayPalProcessor implements PaymentProcessor {
  async charge(amount: number, currency: string): Promise<string> {
    // PayPal API call
    return \`paypal_txn_\${Date.now()}\`;
  }
}

// Adding a new processor = adding a new class, not changing checkout
class CryptoProcessor implements PaymentProcessor {
  async charge(amount: number, currency: string): Promise<string> {
    return \`crypto_txn_\${Date.now()}\`;
  }
}

// Same code path regardless of which processor is injected
async function checkout(processor: PaymentProcessor, total: number): Promise<string> {
  return processor.charge(total, "USD");
}`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go
package payment

import (
  "fmt"
  "time"
)

type PaymentProcessor interface {
  Charge(amount float64, currency string) (string, error)
}

type StripeProcessor struct{ APIKey string }

func (s *StripeProcessor) Charge(amount float64, currency string) (string, error) {
  return fmt.Sprintf("stripe_txn_%d", time.Now().UnixMilli()), nil
}

type PayPalProcessor struct{ ClientID string }

func (p *PayPalProcessor) Charge(amount float64, currency string) (string, error) {
  return fmt.Sprintf("paypal_txn_%d", time.Now().UnixMilli()), nil
}

// Same function works with any processor
func Checkout(processor PaymentProcessor, total float64) (string, error) {
  return processor.Charge(total, "USD")
}`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust
use std::time::{SystemTime, UNIX_EPOCH};

pub trait PaymentProcessor {
  fn charge(&self, amount: f64, currency: &str) -> Result<String, String>;
}

pub struct StripeProcessor { pub api_key: String }

impl PaymentProcessor for StripeProcessor {
  fn charge(&self, _amount: f64, _currency: &str) -> Result<String, String> {
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    Ok(format!("stripe_txn_{}", ts))
  }
}

pub struct PayPalProcessor { pub client_id: String }

impl PaymentProcessor for PayPalProcessor {
  fn charge(&self, _amount: f64, _currency: &str) -> Result<String, String> {
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    Ok(format!("paypal_txn_{}", ts))
  }
}

pub fn checkout(processor: &dyn PaymentProcessor, total: f64) -> Result<String, String> {
  processor.charge(total, "USD")
}`,
      },
    ],
  },

  "composition-over-inheritance": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Inheritance — fragile hierarchy breaks when new combinations arrive
class Animal { move() { return "moves"; } }
class Dog extends Animal { bark() { return "woof"; } }
// What about a dog that can swim AND herd? Hierarchy explodes.

// ✓ Composition — assemble behaviours as interfaces
interface Movable  { move(): string; }
interface Swimmable { swim(): string; }
interface Herder   { herd(): string; }

const walkBehaviour: Movable   = { move: () => "walks on four legs" };
const swimBehaviour: Swimmable = { swim: () => "paddles through water" };
const herdBehaviour: Herder    = { herd: () => "circles the flock" };

class BorderCollie {
  constructor(
    private movement: Movable,
    private swimming: Swimmable,
    private herding: Herder,
  ) {}
  move()  { return this.movement.move(); }
  swim()  { return this.swimming.swim(); }
  herd()  { return this.herding.herd(); }
}

const dog = new BorderCollie(walkBehaviour, swimBehaviour, herdBehaviour);
// Behaviours are independently replaceable and testable`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go — no inheritance; embedding + interfaces is idiomatic composition
package animal

type Mover interface { Move() string }
type Swimmer interface { Swim() string }

type WalkBehaviour struct{}
func (w WalkBehaviour) Move() string { return "walks on four legs" }

type SwimBehaviour struct{}
func (s SwimBehaviour) Swim() string { return "paddles through water" }

// BorderCollie composes behaviours — no class hierarchy required
type BorderCollie struct {
  Mover
  Swimmer
}

func NewBorderCollie() BorderCollie {
  return BorderCollie{
    Mover:   WalkBehaviour{},
    Swimmer: SwimBehaviour{},
  }
}

// dog.Move() delegates to WalkBehaviour, dog.Swim() to SwimBehaviour`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust — traits + structs, no inheritance needed
pub trait Movable  { fn move_action(&self) -> &str; }
pub trait Swimmable { fn swim(&self) -> &str; }

pub struct WalkBehaviour;
impl Movable for WalkBehaviour {
  fn move_action(&self) -> &str { "walks on four legs" }
}

pub struct SwimBehaviour;
impl Swimmable for SwimBehaviour {
  fn swim(&self) -> &str { "paddles through water" }
}

pub struct BorderCollie<M: Movable, S: Swimmable> {
  movement: M,
  swimming: S,
}

impl<M: Movable, S: Swimmable> BorderCollie<M, S> {
  pub fn new(movement: M, swimming: S) -> Self { Self { movement, swimming } }
  pub fn move_action(&self) -> &str { self.movement.move_action() }
  pub fn swim(&self) -> &str { self.swimming.swim() }
}`,
      },
    ],
  },

  "interface-contract": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `interface Cache {
  get(key: string): string | null;
  set(key: string, value: string, ttlSeconds?: number): void;
  delete(key: string): void;
}

// Production: Redis
class RedisCache implements Cache {
  get(key: string)                        { /* Redis GET */ return null; }
  set(key: string, value: string, ttl?: number) { /* Redis SET EX */ }
  delete(key: string)                     { /* Redis DEL */ }
}

// Tests: in-memory — zero infrastructure, instant
class InMemoryCache implements Cache {
  private store = new Map<string, string>();
  get(key: string)  { return this.store.get(key) ?? null; }
  set(key: string, value: string) { this.store.set(key, value); }
  delete(key: string) { this.store.delete(key); }
}

// Service depends on the contract — never on a concrete class
class UserService {
  constructor(private cache: Cache) {}

  async getUser(id: string): Promise<User | null> {
    const hit = this.cache.get(\`user:\${id}\`);
    if (hit) return JSON.parse(hit);
    const user = await db.findUser(id);
    if (user) this.cache.set(\`user:\${id}\`, JSON.stringify(user), 300);
    return user;
  }
}`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go
package cache

import "sync"

type Cache interface {
  Get(key string) (string, bool)
  Set(key, value string)
  Delete(key string)
}

type InMemoryCache struct {
  mu    sync.RWMutex
  store map[string]string
}

func NewInMemoryCache() *InMemoryCache {
  return &InMemoryCache{store: make(map[string]string)}
}

func (c *InMemoryCache) Get(key string) (string, bool) {
  c.mu.RLock(); defer c.mu.RUnlock()
  v, ok := c.store[key]
  return v, ok
}

func (c *InMemoryCache) Set(key, value string) {
  c.mu.Lock(); defer c.mu.Unlock()
  c.store[key] = value
}

func (c *InMemoryCache) Delete(key string) {
  c.mu.Lock(); defer c.mu.Unlock()
  delete(c.store, key)
}

// Service depends on the interface — swap Redis for InMemory without changes
type UserService struct{ cache Cache }`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust
pub trait Cache: Send + Sync {
  fn get(&self, key: &str) -> Option<String>;
  fn set(&self, key: &str, value: &str);
  fn delete(&self, key: &str);
}

pub struct InMemoryCache {
  store: std::sync::RwLock<std::collections::HashMap<String, String>>,
}

impl InMemoryCache {
  pub fn new() -> Self {
    Self { store: std::sync::RwLock::new(std::collections::HashMap::new()) }
  }
}

impl Cache for InMemoryCache {
  fn get(&self, key: &str) -> Option<String> {
    self.store.read().unwrap().get(key).cloned()
  }
  fn set(&self, key: &str, value: &str) {
    self.store.write().unwrap().insert(key.to_string(), value.to_string());
  }
  fn delete(&self, key: &str) {
    self.store.write().unwrap().remove(key);
  }
}

// Service holds a Box<dyn Cache> — any Cache impl works
pub struct UserService { cache: Box<dyn Cache> }`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SOLID PRINCIPLES
  // ─────────────────────────────────────────────────────────────────────────
  "single-responsibility": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Three reasons to change: order logic, email, and invoicing
class OrderService {
  placeOrder(order: Order): void {
    // ... validate and save order
    this.db.save(order);

    // Sending email has nothing to do with placing an order
    const html = \`<h1>Thanks for your order #\${order.id}</h1>\`;
    this.mailer.send({ to: order.email, subject: "Order confirmed", html });

    // PDF generation is a third concern
    const pdf = this.pdfGen.render(order);
    this.storage.upload(\`invoices/\${order.id}.pdf\`, pdf);
  }
}

// ✓ One reason to change per class
class OrderService {
  constructor(
    private repo: OrderRepository,
    private emailer: OrderEmailer,
    private invoicing: InvoiceService,
  ) {}

  async placeOrder(order: Order): Promise<void> {
    await this.repo.save(order);          // one concern
    await this.emailer.confirm(order);    // delegates, doesn't own
    await this.invoicing.generate(order); // delegates, doesn't own
  }
}

class OrderEmailer {
  async confirm(order: Order): Promise<void> { /* only email logic */ }
}

class InvoiceService {
  async generate(order: Order): Promise<void> { /* only PDF logic */ }
}`,
      },
    ],
  },

  "open-closed": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Every new discount type requires editing this method
class DiscountCalculator {
  calculate(order: Order, discountType: string): number {
    if (discountType === "student") return order.total * 0.10;
    if (discountType === "senior")  return order.total * 0.15;
    if (discountType === "vip")     return order.total * 0.20;
    // ❌ adding "employee" means opening this file again
    return 0;
  }
}

// ✓ Add a new discount by adding a new class — nothing existing changes
interface DiscountStrategy {
  calculate(order: Order): number;
}

class StudentDiscount  implements DiscountStrategy {
  calculate(o: Order) { return o.total * 0.10; }
}
class SeniorDiscount   implements DiscountStrategy {
  calculate(o: Order) { return o.total * 0.15; }
}
class VIPDiscount      implements DiscountStrategy {
  calculate(o: Order) { return o.total * 0.20; }
}
// ✓ New discount = new file, zero changes to existing code
class EmployeeDiscount implements DiscountStrategy {
  calculate(o: Order) { return o.total * 0.30; }
}

class DiscountCalculator {
  calculate(order: Order, strategy: DiscountStrategy): number {
    return strategy.calculate(order);
  }
}`,
      },
    ],
  },

  "liskov-substitution": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Square violates the Rectangle contract
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number)  { this.width = w; }
  setHeight(h: number) { this.height = h; }
  area() { return this.width * this.height; }
}

class Square extends Rectangle {
  // ❌ Breaking the contract: setWidth changes height too
  setWidth(s: number)  { this.width = this.height = s; }
  setHeight(s: number) { this.width = this.height = s; }
}

function assertArea(r: Rectangle) {
  r.setWidth(4);
  r.setHeight(5);
  console.assert(r.area() === 20); // ❌ fails for Square — returns 25
}

// ✓ Model correctly — no broken hierarchy
interface Shape { area(): number; }

class Rectangle implements Shape {
  constructor(private w: number, private h: number) {}
  area() { return this.w * this.h; }
}

class Square implements Shape {
  constructor(private side: number) {}
  area() { return this.side ** 2; }
}
// Both are substitutable for Shape — neither breaks the other's contract`,
      },
    ],
  },

  "interface-segregation": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Fat interface — Robot must stub methods it can never use
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

class HumanWorker implements Worker {
  work()  { console.log("working"); }
  eat()   { console.log("eating"); }
  sleep() { console.log("sleeping"); }
}

class Robot implements Worker {
  work()  { console.log("working"); }
  eat()   { throw new Error("Robots do not eat"); }  // ❌ forced stub
  sleep() { throw new Error("Robots do not sleep"); }
}

// ✓ Segregated interfaces — each client depends only on what it uses
interface Workable { work(): void; }
interface Feedable  { eat(): void; }
interface Restable  { sleep(): void; }

class HumanWorker implements Workable, Feedable, Restable {
  work()  { console.log("working"); }
  eat()   { console.log("eating"); }
  sleep() { console.log("sleeping"); }
}

class Robot implements Workable {
  work() { console.log("working"); } // ✓ no stubs, no surprises
}`,
      },
    ],
  },

  "dependency-inversion": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ High-level OrderService directly depends on low-level PostgresDB
class PostgresDB {
  save(order: Order): void { /* SQL INSERT */ }
}

class OrderService {
  private db = new PostgresDB(); // ❌ concrete dependency — impossible to test or swap

  placeOrder(order: Order): void {
    this.db.save(order);
  }
}

// ✓ Both depend on an abstraction — the interface belongs to the high-level layer
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

class OrderService {
  constructor(private repo: OrderRepository) {} // depends on abstraction ✓

  async placeOrder(order: Order): Promise<void> {
    await this.repo.save(order);
  }
}

// Low-level module implements the high-level abstraction
class PostgresOrderRepository implements OrderRepository {
  async save(order: Order)              { /* SQL INSERT */ }
  async findById(id: string)            { /* SQL SELECT */ return null; }
}

// Test double — zero infrastructure required
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();
  async save(o: Order)       { this.orders.set(o.id, o); }
  async findById(id: string) { return this.orders.get(id) ?? null; }
}`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCTIONAL PROGRAMMING
  // ─────────────────────────────────────────────────────────────────────────
  "pure-functions": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Impure — depends on external state, logs as side effect
let taxRate = 0.07;
function calcTotal(price: number, qty: number): number {
  console.log("calculating..."); // side effect
  return price * qty * (1 + taxRate); // hidden external dependency
}

// ✓ Pure — deterministic, no side effects, all inputs explicit
function calcSubtotal(price: number, qty: number): number {
  return price * qty;
}

function applyTax(subtotal: number, taxRate: number): number {
  return subtotal * (1 + taxRate);
}

function formatCurrency(amount: number, symbol = "$"): string {
  return \`\${symbol}\${amount.toFixed(2)}\`;
}

// Compose pure functions — testable, parallelizable, memoizable
const subtotal = calcSubtotal(29.99, 3);    // 89.97
const total    = applyTax(subtotal, 0.07);  // 96.27
const display  = formatCurrency(total);     // "$96.27"`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go
// ❌ Impure
var taxRate = 0.07

func CalcTotal(price, qty float64) float64 {
  fmt.Println("calculating...") // side effect
  return price * qty * (1 + taxRate) // external state
}

// ✓ Pure — all inputs explicit, no side effects
func CalcSubtotal(price, qty float64) float64 {
  return price * qty
}

func ApplyTax(subtotal, taxRate float64) float64 {
  return subtotal * (1 + taxRate)
}

func FormatCurrency(amount float64, symbol string) string {
  return fmt.Sprintf("%s%.2f", symbol, amount)
}

subtotal := CalcSubtotal(29.99, 3)    // 89.97
total    := ApplyTax(subtotal, 0.07)  // 96.27
display  := FormatCurrency(total, "$") // "$96.27"`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust
// ❌ Impure — reads global state, has side effect
static TAX_RATE: f64 = 0.07;
fn calc_total(price: f64, qty: u32) -> f64 {
  println!("calculating..."); // side effect
  price * qty as f64 * (1.0 + TAX_RATE) // global state
}

// ✓ Pure — explicit inputs, no side effects
fn calc_subtotal(price: f64, qty: u32) -> f64 {
  price * qty as f64
}

fn apply_tax(subtotal: f64, tax_rate: f64) -> f64 {
  subtotal * (1.0 + tax_rate)
}

fn format_currency(amount: f64, symbol: &str) -> String {
  format!("{}{:.2}", symbol, amount)
}

let subtotal = calc_subtotal(29.99, 3);
let total    = apply_tax(subtotal, 0.07);
let display  = format_currency(total, "$"); // "$96.27"`,
      },
    ],
  },

  "immutability": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Mutable — modifies the original object; sharing is unsafe
interface Cart { items: string[]; total: number; }

function addItem(cart: Cart, item: string, price: number): Cart {
  cart.items.push(item); // ❌ mutates caller's cart
  cart.total += price;
  return cart;
}

// ✓ Immutable — always return a new value; original is untouched
interface ImmutableCart {
  readonly items: readonly string[];
  readonly total: number;
}

function addItem(cart: ImmutableCart, item: string, price: number): ImmutableCart {
  return {
    items: [...cart.items, item], // new array
    total: cart.total + price,    // new total
  };
}

const cart1 = { items: ["book"], total: 12 };
const cart2 = addItem(cart1, "pen", 3);

console.log(cart1.items); // ["book"]    — unchanged, safe to share
console.log(cart2.items); // ["book", "pen"]`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go — pass structs by value to get copy semantics
package cart

type Cart struct {
  Items []string
  Total float64
}

// ✓ Returns a new Cart — the caller's Cart is never touched
func AddItem(cart Cart, item string, price float64) Cart {
  newItems := make([]string, len(cart.Items)+1)
  copy(newItems, cart.Items)
  newItems[len(cart.Items)] = item
  return Cart{Items: newItems, Total: cart.Total + price}
}`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust — ownership makes immutability the natural default
#[derive(Clone, Debug)]
pub struct Cart {
  pub items: Vec<String>,
  pub total: f64,
}

// ✓ Consumes old cart (or clone it), returns a new one
pub fn add_item(cart: Cart, item: &str, price: f64) -> Cart {
  let mut items = cart.items.clone();
  items.push(item.to_string());
  Cart { items, total: cart.total + price }
}

// With builder-style chaining
impl Cart {
  pub fn with_item(self, item: &str, price: f64) -> Self {
    add_item(self, item, price)
  }
}`,
      },
    ],
  },

  "higher-order-functions": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `const double   = (n: number) => n * 2;
const isEven   = (n: number) => n % 2 === 0;
const toString = (n: number) => \`\${n}\`;

// map / filter / reduce — canonical higher-order functions
const result = [1, 2, 3, 4, 5]
  .filter(isEven)   // [2, 4]
  .map(double)      // [4, 8]
  .map(toString);   // ["4", "8"]

// HOF that returns a function — adds behaviour without changing the original
function withLogging<T extends unknown[], R>(
  name: string,
  fn: (...args: T) => R
): (...args: T) => R {
  return (...args) => {
    console.log(\`[\${name}] args:\`, args);
    const result = fn(...args);
    console.log(\`[\${name}] result:\`, result);
    return result;
  };
}

const loggedDouble = withLogging("double", double);
loggedDouble(5); // logs input and output, returns 10

// Partial application — pre-fill some arguments
const multiply = (a: number) => (b: number) => a * b;
const triple   = multiply(3);
[1, 2, 3].map(triple); // [3, 6, 9]`,
      },
      {
        language: "go",
        label: "Go",
        code: `// Go — functions are first-class values
package hof

func Filter(nums []int, pred func(int) bool) []int {
  var out []int
  for _, n := range nums {
    if pred(n) { out = append(out, n) }
  }
  return out
}

func Map(nums []int, fn func(int) int) []int {
  out := make([]int, len(nums))
  for i, n := range nums { out[i] = fn(n) }
  return out
}

// HOF — accepts a function, returns a new function that wraps it
func WithLogging(name string, fn func(int) int) func(int) int {
  return func(n int) int {
    result := fn(n)
    fmt.Printf("[%s] %d -> %d\\n", name, n, result)
    return result
  }
}

double       := func(n int) int { return n * 2 }
loggedDouble := WithLogging("double", double)

evens   := Filter([]int{1, 2, 3, 4, 5}, func(n int) bool { return n%2 == 0 })
doubled := Map(evens, loggedDouble) // [4, 8] with logging`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Rust — closures are first-class; iterators are HOFs
let double  = |n: i32| n * 2;
let is_even = |n: &i32| n % 2 == 0;

let result: Vec<i32> = vec![1, 2, 3, 4, 5]
  .into_iter()
  .filter(is_even)
  .map(double)
  .collect(); // [4, 8]

// HOF — takes a fn, returns a closure that wraps it with logging
fn with_logging<F>(name: &'static str, f: F) -> impl Fn(i32) -> i32
where F: Fn(i32) -> i32 {
  move |n| {
    let result = f(n);
    println!("[{}] {} -> {}", name, n, result);
    result
  }
}

let logged = with_logging("double", |n| n * 2);
logged(5); // logs "5 -> 10", returns 10

// Partial application via closures
let multiply = |a: i32| move |b: i32| a * b;
let triple   = multiply(3);
let tripled: Vec<i32> = vec![1, 2, 3].into_iter().map(triple).collect();`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GENERAL PRINCIPLES
  // ─────────────────────────────────────────────────────────────────────────
  "dry-principle": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ DRY violation — the email validation rule lives in three places
function createUser(email: string, name: string): User {
  if (!email.includes("@") || !email.includes(".")) {
    throw new Error("Invalid email");
  }
  return { email, name };
}

function updateEmail(userId: string, email: string): void {
  if (!email.includes("@") || !email.includes(".")) { // ❌ copy-pasted
    throw new Error("Invalid email");
  }
  db.updateEmail(userId, email);
}

function inviteUser(email: string): void {
  if (!email.includes("@") || !email.includes(".")) { // ❌ again
    throw new Error("Invalid email");
  }
  mailer.sendInvite(email);
}

// ✓ Single authoritative source — change it once, applied everywhere
function validateEmail(email: string): void {
  if (!email.includes("@") || !email.includes(".")) {
    throw new Error("Invalid email");
  }
}

function createUser(email: string, name: string): User {
  validateEmail(email);
  return { email, name };
}

function updateEmail(userId: string, email: string): void {
  validateEmail(email);
  db.updateEmail(userId, email);
}

function inviteUser(email: string): void {
  validateEmail(email);
  mailer.sendInvite(email);
}`,
      },
    ],
  },

  "kiss-principle": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Over-engineered — solving a hypothetical problem with a generic framework
abstract class SortStrategy<T> {
  abstract sort(data: T[]): T[];
}
class SortStrategyFactory<T> {
  create(algo: "bubble" | "quick" | "merge"): SortStrategy<T> { /* ... */ }
}
class SortingPipeline<T> {
  constructor(private factory: SortStrategyFactory<T>) {}
  sort(data: T[]): T[] {
    const strategy = this.factory.create("quick");
    return strategy.sort(data);
  }
}
// 30 lines to sort an array

// ✓ Simple — solve the actual problem
function sortByPrice(items: Item[]): Item[] {
  return [...items].sort((a, b) => a.price - b.price);
}
// 1 line. Add complexity only when the problem actually demands it.`,
      },
    ],
  },

  "yagni-principle": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Speculative — building a plugin system "we might need later"
interface FormatterPlugin { transform(text: string): string; }

class TextFormatter {
  private plugins: FormatterPlugin[] = [];
  registerPlugin(p: FormatterPlugin) { this.plugins.push(p); }
  format(text: string): string {
    return this.plugins.reduce((t, p) => p.transform(t), text);
  }
}
// Spent two days building this. Plugins: 0. Users who asked for it: 0.

// ✓ Build what you need now; refactor when the second use case arrives
function formatText(text: string): string {
  return text.trim().replace(/\\s+/g, " ");
}

// When a real second use case arrives, you'll know exactly what the
// abstraction should look like — and you'll build it with full knowledge.`,
      },
    ],
  },

  "separation-of-concerns": {
    projectStructure: ``,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// ❌ Data fetching, business logic, and presentation all tangled together
async function renderUserCard(userId: string): Promise<string> {
  const res  = await fetch(\`/api/users/\${userId}\`); // data fetching in presentation
  const raw  = await res.json();
  const name = \`\${raw.firstName} \${raw.lastName}\`;  // business logic in presentation
  const init = \`\${raw.firstName[0]}\${raw.lastName[0]}\`.toUpperCase();
  return \`<div class="card"><span class="avatar">\${init}</span>\${name}</div>\`;
}

// ✓ Each layer does one job; each can change without touching the others
// ── Data layer ──────────────────────────────────────────────────────────
async function fetchUser(id: string): Promise<RawUser> {
  return fetch(\`/api/users/\${id}\`).then(r => r.json());
}

// ── Domain / transformation layer ───────────────────────────────────────
interface User { name: string; initials: string; }
function toUser(raw: RawUser): User {
  return {
    name:     \`\${raw.firstName} \${raw.lastName}\`,
    initials: \`\${raw.firstName[0]}\${raw.lastName[0]}\`.toUpperCase(),
  };
}

// ── Presentation layer ──────────────────────────────────────────────────
function renderUserCard(user: User): string {
  return \`<div class="card"><span class="avatar">\${user.initials}</span>\${user.name}</div>\`;
}

// Composed at the boundary — each concern independently testable
async function showUserCard(userId: string): Promise<string> {
  return renderUserCard(toUser(await fetchUser(userId)));
}`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OBSERVER PATTERN (original)
  // ─────────────────────────────────────────────────────────────────────────
  "observer-pattern": {
    projectStructure: `src/
├── events/
│   └── order-events.ts          # Strongly-typed event union
├── observers/
│   ├── observer.ts              # Observer interface
│   ├── email-notifier.ts        # Sends confirmation email
│   ├── inventory-updater.ts     # Decrements stock
│   └── analytics-tracker.ts    # Records metrics
└── order-service.ts             # Subject — emits events`,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// events/order-events.ts
export type OrderEvent =
  | { type: "ORDER_PLACED";    orderId: string; customerId: string; total: number }
  | { type: "ORDER_CANCELLED"; orderId: string; reason: string };

// observers/observer.ts
export interface OrderObserver {
  onEvent(event: OrderEvent): Promise<void>;
}

// order-service.ts — Subject
export class OrderService {
  private observers: OrderObserver[] = [];

  subscribe(observer: OrderObserver)   { this.observers.push(observer); }
  unsubscribe(observer: OrderObserver) {
    this.observers = this.observers.filter(o => o !== observer);
  }

  async placeOrder(order: NewOrder): Promise<string> {
    const saved = await this.repo.save(order);
    await this.notify({
      type: "ORDER_PLACED",
      orderId: saved.id,
      customerId: order.customerId,
      total: order.total,
    });
    return saved.id;
  }

  private async notify(event: OrderEvent) {
    await Promise.all(this.observers.map(o => o.onEvent(event)));
  }
}

// observers/email-notifier.ts
export class EmailNotifier implements OrderObserver {
  async onEvent(event: OrderEvent) {
    if (event.type === "ORDER_PLACED") {
      await this.email.send(\`Order \${event.orderId} confirmed — $\${event.total}\`);
    }
  }
}

// bootstrap — wire observers at startup
const svc = new OrderService(repo);
svc.subscribe(new EmailNotifier(emailService));
svc.subscribe(new InventoryUpdater(inventoryRepo));
svc.subscribe(new AnalyticsTracker(analytics));`,
      },
      {
        language: "go",
        label: "Go",
        code: `// event types
type OrderEventType = string
const (
	OrderPlaced    OrderEventType = "ORDER_PLACED"
	OrderCancelled OrderEventType = "ORDER_CANCELLED"
)

type OrderEvent struct {
	Type       OrderEventType
	OrderID    string
	CustomerID string
	Total      float64
	Reason     string
}

// Observer interface
type OrderObserver interface {
	OnEvent(ctx context.Context, event OrderEvent) error
}

// Subject
type OrderService struct {
	repo      OrderRepository
	observers []OrderObserver
}

func (s *OrderService) Subscribe(o OrderObserver) {
	s.observers = append(s.observers, o)
}

func (s *OrderService) PlaceOrder(ctx context.Context, order *Order) (string, error) {
	saved, err := s.repo.Save(ctx, order)
	if err != nil { return "", err }

	event := OrderEvent{Type: OrderPlaced, OrderID: saved.ID, Total: order.Total}
	for _, o := range s.observers {
		go o.OnEvent(ctx, event)  // async fan-out; use errgroup for error handling
	}
	return saved.ID, nil
}

// Email observer
type EmailNotifier struct{ email EmailService }
func (n *EmailNotifier) OnEvent(ctx context.Context, e OrderEvent) error {
	if e.Type == OrderPlaced {
		return n.email.Send(ctx, fmt.Sprintf("Order %s confirmed", e.OrderID))
	}
	return nil
}`,
      },
      {
        language: "rust",
        label: "Rust",
        code: `// Strongly-typed event enum
#[derive(Debug, Clone)]
pub enum OrderEvent {
    Placed    { order_id: String, customer_id: String, total: f64 },
    Cancelled { order_id: String, reason: String },
}

// Observer trait
#[async_trait]
pub trait OrderObserver: Send + Sync {
    async fn on_event(&self, event: &OrderEvent) -> Result<()>;
}

// Subject
pub struct OrderService {
    repo:      Arc<dyn OrderRepository>,
    observers: Vec<Arc<dyn OrderObserver>>,
}

impl OrderService {
    pub fn subscribe(&mut self, o: Arc<dyn OrderObserver>) {
        self.observers.push(o);
    }

    pub async fn place_order(&self, order: NewOrder) -> Result<String> {
        let saved = self.repo.save(&order).await?;
        let event = OrderEvent::Placed {
            order_id:    saved.id.clone(),
            customer_id: order.customer_id,
            total:       order.total,
        };
        self.notify(&event).await;
        Ok(saved.id)
    }

    async fn notify(&self, event: &OrderEvent) {
        let tasks: Vec<_> = self.observers.iter()
            .map(|o| { let o = o.clone(); let e = event.clone();
                tokio::spawn(async move { o.on_event(&e).await })
            })
            .collect();
        join_all(tasks).await;
    }
}

// Email observer
pub struct EmailNotifier { email: Arc<dyn EmailService> }

#[async_trait]
impl OrderObserver for EmailNotifier {
    async fn on_event(&self, event: &OrderEvent) -> Result<()> {
        if let OrderEvent::Placed { order_id, .. } = event {
            self.email.send(&format!("Order {order_id} confirmed")).await?;
        }
        Ok(())
    }
}`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────
  "authentication": {
    projectStructure: `src/
├── auth/
│   ├── pkce.ts              # PKCE helpers (code_verifier + challenge)
│   ├── token.ts             # JWT sign, verify, refresh
│   ├── oauth-client.ts      # Authorization Code + PKCE flow
│   └── middleware.ts        # Request auth guard
├── routes/
│   ├── login.ts             # GET /login → redirect to Auth Server
│   ├── callback.ts          # GET /callback → exchange code for tokens
│   └── protected.ts         # Routes guarded by auth middleware
└── config/
    └── auth.ts              # client_id, scopes, JWKS URL, issuer`,
    examples: [
      {
        language: "typescript",
        label: "TypeScript",
        code: `// auth/pkce.ts — PKCE helpers (RFC 7636)
import crypto from "crypto";

export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString("base64url").slice(0, 128);
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// auth/oauth-client.ts — Authorization Code + PKCE flow
export function buildAuthorizationUrl(params: {
  authEndpoint: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  state: string;
}): string {
  const url = new URL(params.authEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.scopes.join(" "));
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeCodeForTokens(params: {
  tokenEndpoint: string;
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ access_token: string; refresh_token: string; id_token?: string }> {
  const res = await fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: params.clientId,
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(\`Token exchange failed: \${res.status}\`);
  return res.json();
}

// auth/token.ts — JWT verification (stateless, no DB lookup)
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://auth.example.com/.well-known/jwks.json")
);

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: "https://auth.example.com",
    audience: "https://api.example.com",
  });
  return payload; // typed: sub, scope, exp, iat, ...
}

// auth/middleware.ts — Express/Next.js auth guard
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    req.user = await verifyAccessToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}`,
      },
      {
        language: "go",
        label: "Go",
        code: `// auth/pkce.go — PKCE helpers
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
)

func GenerateCodeVerifier() (string, error) {
	b := make([]byte, 64)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b)[:96], nil
}

func GenerateCodeChallenge(verifier string) string {
	h := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

// auth/token.go — JWT verification via JWKS
package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

type Claims struct {
	Subject string
	Email   string
	Scope   string
}

type Verifier struct {
	cache   *jwk.Cache
	issuer  string
	audience string
}

func NewVerifier(jwksURL, issuer, audience string) (*Verifier, error) {
	cache := jwk.NewCache(context.Background())
	if err := cache.Register(jwksURL, jwk.WithMinRefreshInterval(15*time.Minute)); err != nil {
		return nil, err
	}
	return &Verifier{cache: cache, issuer: issuer, audience: audience}, nil
}

func (v *Verifier) Verify(ctx context.Context, tokenStr string) (*Claims, error) {
	keySet, err := v.cache.Get(ctx, v.issuer+"/.well-known/jwks.json")
	if err != nil {
		return nil, fmt.Errorf("fetch JWKS: %w", err)
	}
	token, err := jwt.Parse([]byte(tokenStr),
		jwt.WithKeySet(keySet),
		jwt.WithValidate(true),
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(v.audience),
	)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}
	scope, _ := token.Get("scope")
	email, _ := token.Get("email")
	return &Claims{
		Subject: token.Subject(),
		Email:   fmt.Sprint(email),
		Scope:   fmt.Sprint(scope),
	}, nil
}

// auth/middleware.go — HTTP auth guard
func AuthMiddleware(v *Verifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, "missing token", http.StatusUnauthorized)
				return
			}
			claims, err := v.Verify(r.Context(), strings.TrimPrefix(header, "Bearer "))
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey{}, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}`,
      },
    ],
  },
};
