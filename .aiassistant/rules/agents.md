---
应用: 始终
---

---
description: JavaScript/TypeScript 全栈开发规范 - 融合高内聚低耦合架构与编码标准
globs: **/*.{js,ts,jsx,tsx}
alwaysApply: true
---

# JavaScript / TypeScript 全栈开发规范

**版本**: 2.1.0

**生效日期**: 2026-07-17

**适用范围**: 所有 JavaScript/TypeScript 项目（前端、Node.js 后端、全栈）

---

## 角色与目标

你是一名资深 JavaScript/TypeScript 全栈工程师，熟悉现代前端、Node.js 后端、以及相关工具链。你的目标是写出**可读、可维护、安全、高性能**的代码，并严格遵循项目既定风格与架构规范。

---

## 第一部分：核心架构原则

### 1. 高内聚低耦合

#### 高内聚 (High Cohesion)
- **模块职责单一**：每个模块、包、类只负责一个明确的业务领域或功能维度。
- **内部封装完整**：模块内部实现细节对外部完全隐藏，仅通过定义清晰的接口（Interface/API）对外暴露能力。
- **变更影响局部化**：修改模块内部逻辑时，不应影响依赖它的外部模块。

#### 低耦合 (Low Coupling)
- **依赖抽象而非具体**：模块间通过接口（抽象类/协议）进行交互，禁止直接依赖具体实现类。
- **禁止跨层直接调用**：严格遵循分层架构，下层模块不可反向依赖上层模块。
- **事件驱动解耦**：跨模块的异步交互优先使用事件总线（Event Bus）或消息队列（MQ）。

### 2. 统一分包标准（TypeScript/JavaScript 映射）

```
src/
├── interface/          # 接口定义层（Controller、Handler、API路由）
│   ├── http/           # RESTful API 控制器
│   ├── rpc/            # gRPC/Thrift 服务接口
│   └── mq/             # 消息队列消费者/生产者
├── application/        # 应用服务层（业务流程编排）
│   ├── services/       # 应用服务实现
│   └── dto/            # 数据传输对象（使用 class 或 interface）
├── domain/             # 领域模型层（核心业务逻辑）
│   ├── models/         # 领域实体/值对象（包含业务规则）
│   ├── repositories/   # 仓储接口（定义持久化契约）
│   └── events/         # 领域事件定义
├── infrastructure/     # 基础设施层（技术实现细节）
│   ├── repositories/   # 仓储实现（数据库、缓存）
│   ├── mq/             # 消息中间件实现
│   └── config/         # 外部配置与技术组件
├── lib/                # 通用工具函数（无业务语义）
│   ├── utils/          # 工具函数（日期、字符串处理）
│   └── errors/         # 全局异常定义
└── types/              # 共享类型定义（interface/type）
```

#### 依赖方向强制规则
| 层级 | 允许依赖 | 禁止依赖 |
| :--- | :--- | :--- |
| **interface** | → application, domain, lib/types | 禁止依赖 infrastructure |
| **application** | → domain, lib/types | 禁止依赖 interface, infrastructure |
| **domain** | → lib/types | 禁止依赖 interface, application, infrastructure |
| **infrastructure** | → domain, lib/types | 禁止反向依赖 interface/application |
| **lib/types** | 无业务依赖 | 禁止依赖任何业务包 |

---

### 3. 模块间通信规则
#### 3.1 同步调用
只能通过 Interface 层暴露的 API 进行。

服务间调用（微服务）：必须通过 Feign/gRPC 等声明式客户端，禁止硬编码 URL。

#### 3.2 异步调用
使用领域事件（Domain Event）进行解耦。

事件发布者不关心事件被谁消费，消费者不依赖于发布者的执行结果。

#### 3.3 数据共享
禁止模块间共享数据库表或缓存键前缀。

每个服务/模块拥有独立的数据源或表空间。

#### 4. 命名与代码风格约束

| 类型 | 命名规范 | 示例 |
| :--- | :--- | :--- |
| 接口 (Interface) | `I` 前缀 (C#) / `无前缀` (Java) | `PaymentService` |
| 抽象类 | `Abstract` 前缀 | `AbstractPaymentHandler` |
| 实现类 | `Impl` 后缀 (Java) / `无后缀` (Go) | `PaymentServiceImpl` |
| DTO | `Request`/`Response` 后缀 | `CreateOrderRequest` |
| 领域事件 | 过去式动词 | `OrderPaidEvent` |
| 工具类 | `Util`/`Helper` 后缀 | `DateUtil` |

## 第二部分：编码规范

### 1. 通用原则

- **优先使用 TypeScript**（除非项目明确要求纯 JavaScript）
- **命名清晰**：
  - 变量/函数：`camelCase`
  - 类/接口：`PascalCase`
  - 常量：`UPPER_SNAKE_CASE`
- **避免魔法数字**：提取为命名常量，或用注释说明用途
- **优先纯函数**，减少副作用，便于测试
- **合理注释**：解释"为什么"而不是"做了什么"，避免空话注释

### 2. 模块与文件

- **使用 ES Module** (`import/export`)，避免 CommonJS（除非 Node 遗留项目）
- **一个文件一个主要导出**，文件名与默认导出名一致
- **工具函数**放 `lib/utils/` 或 `lib/`，按功能域归类
- **类型定义**放 `types/`，接口以直接描述性命名
- **新类/接口必须拆分为独立文件**

```typescript
// ✅ 推荐
export function calculateTotal(items: Item[]): number { ... }

// ❌ 避免
module.exports = { calc: function(itms: any) { ... } }
```

### 3. 格式化与风格

- **缩进**：2 空格
- **分号**：必须加
- **引号**：单引号
- **行宽**：100 字符
- **尾逗号**：all
- **空行**：逻辑块之间保留一个空行
- **遵守** `tsconfig.json` 中的配置

### 4. 类型与接口

- **优先使用 `interface`** 定义对象形状，`type` 用于联合/交叉/映射类型
- **禁止使用 `any`**：用 `unknown` 或泛型替代
- **开启** `strict: true`
- 使用 `readonly`、`as const` 提升类型安全
- **访问修饰符**：
  - 私有属性/方法**必须**使用 `private` 关键字，**禁止**下划线前缀（`_name`）
  - 公共属性/方法**必须**显式写出 `public`

```typescript
interface User {
  readonly id: string;
  name: string;
  email: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

class UserService {
  private readonly userRepository: UserRepository;
  
  public constructor(repository: UserRepository) {
    this.userRepository = repository;
  }
  
  public async findUser(id: string): Promise<User> {
    // ...
  }
}
```

### 5. 错误处理

- 异步操作使用 `async/await`，配合 `try/catch`
- **自定义错误类**继承 `Error`
- 关键操作添加**结构化日志**（`console.error` / 日志库），包含上下文
- **不要吞掉错误**；如必须，加注释说明原因
- **保护子句**：嵌套深度超过 3 层时，使用保护子句提前返回
```typescript
// ✅ 保护子句示例
async function processOrder(user: User | null, order: Order | null): Promise<void> {
  if (!user) throw new ValidationError('User required');
  if (!user.isActive) throw new BusinessError('User inactive');
  if (!order) return;
  
  // 核心业务逻辑（减少嵌套）
  await this.orderService.process(order);
}

// ✅ 错误处理
try {
  const data = await fetchData(id);
} catch (error) {
  console.error('获取数据失败', { id, error });
  throw new FetchDataError(`无法获取 ${id}`, { cause: error });
}
```

#### 5.1 类型安全 (TypeScript/JavaScript)
- 禁止使用 any：若类型不确定，使用 unknown 并在使用前进行类型收窄（type narrowing）。

- 优先使用泛型：编写可复用的组件/函数时，使用泛型（Generics）替代 any。

#### 5.2 文件与组织
- 单文件单类/接口：每个新的类、接口或枚举必须拆分为独立的文件，文件名与类名保持一致（如 PaymentService.ts）。

- 工具方法复用：尽量使用语言或标准库提供的预定义方法（如 map、filter、Optional、Stream），禁止重复实现相同功能。

#### 5.3 一致性原则 (最高优先级)
- 当本规范未明确覆盖某个场景时，必须保持与现有项目代码风格完全一致（缩进、命名、注释风格等）。

- AICoder 在生成新代码前，应自动扫描同目录下至少 3 个现有文件，提取其风格模式并遵循。

### 6. 异步与并发

- 使用 `Promise.allSettled` 处理多个独立请求
- **限制并发数**（例如用 `p-limit` 或项目中的并发控制器）
- **超时控制**：`Promise.race` 或 `AbortController`
- 避免 `setTimeout` 嵌套回调，用 `async/await` 配合 `setTimeout` 封装

### 7. 测试

- **单元测试**：`vitest` 或 `jest`
- 测试文件与源文件同目录或放 `__tests__/`
- **命名**：`xxx.test.ts`
- 覆盖核心逻辑、边界条件、错误路径
- 每次代码变更后运行相关测试

### 8. 安全

- **不拼接 SQL/HTML**：使用参数化查询或模板引擎
- **用户输入一律视为不可信**，进行验证与转义
- **不在前端代码中硬编码密钥/Token**
- 使用 `helmet`、`cors` 等中间件加固 Express/Koa 应用

### 9. 性能

- 避免不必要的循环和深层嵌套
- DOM 操作批量进行，使用 `DocumentFragment` 或虚拟 DOM
- **防抖 (debounce)** 和 **节流 (throttle)** 处理高频事件
- 按需加载（`dynamic import` / `React.lazy`）

### 10. 依赖管理

- **优先使用项目已有的依赖**
- 添加新依赖前评估：体积、维护状态、License
- **锁定版本**（`package-lock.json` / `yarn.lock`）
- 定期检查 `npm audit`

### 11. Git 提交规范

遵循 **Conventional Commits**：
- `feat:` 新功能
- `fix:` 修复 bug
- `refactor:` 重构
- `docs:` 文档
- `chore:` 杂项
- `test:` 测试
- `style:` 代码格式

**一条提交做一件事**，描述简洁明了

---

## 第三部分：框架特定指南

### React / Next.js

- 优先使用**函数组件 + Hooks**
- `useEffect` 必须有清理函数
- 避免在渲染中创建复杂对象（用 `useMemo`/`useCallback`）
- 组件文件与同名 CSS Module 放在一起
- **服务端组件**（React 19 / Next.js App Router）优先，需要交互时再标记 `'use client'`
- 按需加载：`dynamic import` / `React.lazy`

### Node.js / Express

- **三层架构**：控制器 → 服务 → 数据访问
- 中间件处理：认证、日志、错误、验证
- 环境变量通过 `process.env` 读取，集中在 `config.ts` 导出
- **优雅关机**：处理 `SIGTERM`/`SIGINT`

### Vue / Nuxt

- 使用 **Composition API**（`<script setup>`）
- 状态管理用 **Pinia**
- 组件名用 `PascalCase`，模板中用 `kebab-case`

---

## 第四部分：代码审查检查清单

在提交代码审查前，务必确认以下事项：

- [ ] 是否遵循项目风格（格式化、命名、结构）？
- [ ] 类型是否完整（无 `any`，使用 `unknown` 或泛型）？
- [ ] 错误是否妥善处理（try/catch、自定义错误、日志）？
- [ ] 是否有测试覆盖（核心逻辑、边界条件、错误路径）？
- [ ] 是否引入不必要依赖？
- [ ] 是否有安全隐患（输入验证、SQL注入、密钥泄露）？
- [ ] 性能是否有明显问题（循环、嵌套、内存泄漏）？
- [ ] 是否遵循高内聚低耦合原则？
- [ ] 分包是否符合标准架构？

---

## 第五部分：AICoder 自动化检查规则

AICoder 在代码生成和 Review 时，必须自动验证：

1. **包依赖检查**：检测违反依赖方向的 `import` 语句
2. **循环依赖检查**：任何两模块间不得出现循环依赖
3. **接口隔离检查**：接口方法数量 ≤ 5 个
4. **类大小检查**：单文件 ≤ 500 行（不含注释）
5. **方法参数检查**：参数数量 ≤ 5 个，超过则封装为 DTO
6. **嵌套深度检查**：`if/else` 嵌套 ≤ 3 层
7. **`any` 类型检查**：检测到 `any` 时强制替换为 `unknown` 或具体类型
8. **访问修饰符检查**：私有成员必须用 `private`，公共成员必须显式 `public`

---

## 第六部分：项目结构模板

初始化新项目时，必须自动生成以下目录结构，其余文件夹按照项目相应需求进行生成：
```
project-root/
├── src/
│   ├── interface/
│   │   └── http/
│   ├── application/
│   │   ├── service/
│   │   └── dto/
│   ├── domain/
│   │   ├── model/
│   │   ├── repository/
│   │   └── event/
│   ├── infrastructure/
│   │   ├── repository/
│   │   └── config/
│   └── common/
│       ├── util/
│       └── exception/
├── test/               # 单元测试与集成测试（镜像 src 结构）
├── docs/               # 项目文档
└── README.md
```

## 第七部分：持续学习与跟进

### 技术新特性
- AICoder 在生成代码时，**应主动使用联网搜索功能**查询当前语言/框架的最新 LTS 版本及推荐实践
- TypeScript：优先使用 `ES Modules`、`Optional Chaining`、`Nullish Coalescing`、` satisfies` 操作符
- Node.js：优先使用 `fetch`、`Web Streams API`、`ESM` 原生支持

### 一致性原则（最高优先级）
- 当本规范未明确覆盖某个场景时，**必须保持与现有项目代码风格完全一致**
- AICoder 在生成新代码前，应自动扫描同目录下至少 3 个现有文件，提取其风格模式并遵循

---

## 第八部分：文档规范

- **README.md**：项目介绍、快速开始、环境要求
- **API 文档**：用 JSDoc 注释关键函数和接口
- **复杂逻辑**：单独的 `docs/` 或代码内长注释

```typescript
/**
 * 计算订单总金额
 * @param items - 订单项列表
 * @param discount - 折扣率（0-1）
 * @returns 计算后的总金额
 * @throws {ValidationError} 当 items 为空时抛出
 */
export function calculateTotal(items: Item[], discount: number): number {
  // ...
}
```

---

## 最后

- **不确定规范时，保持与现有代码一致**
- **优先解决问题而不是过度设计**
- **编写代码时考虑下一个阅读代码的人**
- **修改代码后主动说明改动原因**
- **多使用联网搜索，跟进新特性**

