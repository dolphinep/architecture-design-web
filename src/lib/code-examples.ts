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
};
