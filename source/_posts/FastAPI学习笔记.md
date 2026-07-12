---
title: FastAPI学习笔记
tags:
  - fastapi
  - python
categories:
  - 学习笔记
abbrlink: 3717
date: 2026-07-12 16:59:14
---
## 前言

FastAPI 是一个基于 Python 类型标注构建的现代 Web API 框架。它最大的特点不是“语法短”，而是把接口开发中很多原本分散的工作统一到了函数签名和类型注解中。

路径参数、查询参数、请求体、响应模型、依赖注入、认证、安全、自动文档，这些内容在 FastAPI 里都能用一种比较统一的方式表达。

很多人第一次上手 FastAPI，会觉得它有点像 Flask 的轻量，又兼具 Django REST Framework 一部分工程化能力。这种感觉很正常。因为 FastAPI 既保留了 Python 开发中很自然的函数式写法，又把接口校验、文档生成、类型提示、异步支持这些能力做成了默认体验。

FastAPI 最值得学习的地方并不只是"怎么写一个接口"，而是它提供了一种更现代的 API 开发方式：**代码本身就在描述接口契约**。

## 一、FastAPI 到底解决了什么问题

传统 Web 开发里，写一个接口经常会遇到这些重复工作：

- 从 URL 里拿路径参数

- 从查询字符串里拿分页、搜索条件

- 手动读取 JSON

- 手动判断字段是否存在

- 手动判断字段类型是否正确

- 手动返回错误信息

- 手动整理接口说明文档

这些事其实都不难，但非常重复，而且很容易写得不统一。项目小时问题不大，一旦接口变多，维护成本会快速上升。

FastAPI 的核心思路就是：**把接口定义这件事前置**。你在函数参数里写清楚这个参数是什么类型、从哪里来、是否必填、是否有默认值；你在 Pydantic 模型里写清楚请求体和响应体长什么样；然后框架帮你完成解析、校验、错误处理和文档生成。

FastAPI 的优势并不是单点能力，而是整条接口开发链路都很顺：

- 写代码时有类型提示

- 请求到来时自动校验

- 出错时自动给出结构化错误

- 调试时有 Swagger 文档

- 输出时能用响应模型自动过滤字段

- 项目变大后还能依赖依赖注入继续组织代码

## 二、第一个 FastAPI 程序

最小示例：

```python
from fastapi import FastAPI
app = FastAPI()
@app.get("/")
async def root():
    return {"message": "Hello World"}
```

这段代码可以拆成三部分理解：

**第一部分 `app = FastAPI()`** —— 创建应用实例。后面所有的路由、中间件、依赖、事件处理、文档配置，基本都围绕这个 `app` 来展开。

**第二部分 `@app.get("/")`** —— 路径操作装饰器。表示当有一个 GET 请求访问根路径 `/` 时，交给下面这个函数处理。

**第三部分 `async def root()`** —— 路径操作函数。请求来了之后，它返回一个 Python 字典，FastAPI 会自动把它转换成 JSON 响应。

这个例子虽然简单，但已经把 FastAPI 最重要的几个概念都带出来了：

- 应用实例

- 路由

- 路径操作函数

- 自动 JSON 响应

> **建议**：每写完一个接口，就打开自动文档看一眼。FastAPI 不只是能"跑起来"，它还会自动生成接口文档。这个过程对学习非常有帮助，因为你能同时看到代码定义和接口表现。

## 三、自动文档——FastAPI 的核心优势

FastAPI 在启动应用后，会默认提供两套接口文档页面：

- `/docs`：Swagger UI

- `/redoc`：ReDoc

很多框架也可以做文档，但 FastAPI 的特殊之处在于：**文档并不是额外插件拼出来的，而是直接由代码定义推导出来的**。

也就是说，当你写下路由路径、请求方法、参数类型、请求体模型、响应模型、认证方式这些信息时，FastAPI 会自动把它们组装成 OpenAPI 描述，再生成可交互文档页面。

所以在 FastAPI 里，**文档不是"后补"的，而是接口定义的一部分**。

这件事非常重要。因为真实项目中，很多联调问题并不是业务逻辑错了，而是接口文档和实际代码不一致。而 FastAPI 通过自动生成文档，天然降低了这类问题。

## 四、路由与 HTTP 方法

FastAPI 使用装饰器声明路由，最常见的有：

- `@app.get()`

- `@app.post()`

- `@app.put()`

- `@app.delete()`

- `@app.patch()`

示例：

```python
from fastapi import FastAPI
app = FastAPI()
@app.get("/books")
async def get_books():
    return [{"id": 1, "name": "FastAPI Guide"}]
@app.post("/books")
async def create_book():
    return {"msg": "book created"}
@app.put("/books/{book_id}")
async def update_book(book_id: int):
    return {"msg": f"book {book_id} updated"}
@app.delete("/books/{book_id}")
async def delete_book(book_id: int):
    return {"msg": f"book {book_id} deleted"}
```

HTTP 方法语义：

- **GET**：查询资源

- **POST**：创建资源

- **PUT**：整体更新资源

- **PATCH**：部分更新资源

- **DELETE**：删除资源

FastAPI 并不会强制你必须按照 REST 风格来设计，但在实际项目中，尽量遵循这些 HTTP 语义是很有必要的。因为这会让接口更容易理解，也更利于前后端协作。

## 五、路径参数：让 URL 也具备类型能力

路径参数写法非常直观：

```python
from fastapi import FastAPI
app = FastAPI()
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}
```

这里 `item_id` 是路径中的动态部分。请求 `/items/3` 时，FastAPI 会把 `3` 解析出来，并根据函数参数的类型标注，自动尝试转成整数。

也就是说，这里不是单纯"拿到一个字符串"，而是：

- 自动读取路径参数

- 自动进行类型转换

- 自动在类型不匹配时报错

如果访问的是 `/items/abc`，因为 `abc` 无法转成 `int`，FastAPI 会自动返回参数校验错误。

这就是 FastAPI 一个非常强的特点：**参数声明即校验规则**。在 FastAPI 里，URL 不是简单的字符串模板，而是被类型系统约束的一部分接口定义。

## 六、查询参数：默认值、可选值和必填值

查询参数是最能体现 FastAPI 设计风格的地方：

```python
from fastapi import FastAPI
app = FastAPI()
@app.get("/items/")
async def read_items(q: str | None = None, page: int = 1):
    return {"q": q, "page": page}
```

这里：

- `q` 是可选查询参数，因为默认值是 `None`

- `page` 也是可选参数，因为它有默认值 `1`

访问 `/items/?q=python&page=2` 就可以得到对应结果。

如果你把参数写成这样：

```python
@app.get("/items/")
async def read_items(q: str):
    return {"q": q}
```

那么 `q` 就是**必填**查询参数，因为它没有默认值。

FastAPI 对查询参数的判断非常自然：

- 有默认值 → 不是必填

- 没有默认值 → 必填

这种规则的好处是，代码非常贴近 Python 本身的函数语义，不需要额外学一套复杂配置。

## 七、给查询参数加约束

实际开发中，查询参数往往不是"有就行"，而是会有长度、范围、格式等要求。FastAPI 支持通过 `Query()` 给参数增加约束。

例如：

```python
from typing import Annotated
from fastapi import FastAPI, Query
app = FastAPI()
@app.get("/search")
async def search(
    keyword: Annotated[str | None, Query(min_length=2, max_length=50)] = None
):
    return {"keyword": keyword}
```

这段代码表示：

- `keyword` 是一个可选字符串

- 最短 2 个字符

- 最长 50 个字符

这样做的价值有两层：

1. **输入校验**：如果调用方传了不符合规则的参数，FastAPI 会直接返回校验错误。

2. **文档清晰**：这些约束会自动出现在接口文档页面中，使用方能一眼知道参数要求。

所以 FastAPI 的参数约束，不只是面向代码运行，也是面向接口协作。

## 八、请求体：FastAPI 最核心的体验之一

FastAPI 的请求体处理能力，几乎是它最吸引人的地方。最常见的写法是配合 Pydantic 模型使用。

例如：

```python
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI()
class Item(BaseModel):
    name: str
    price: float
    is_offer: bool = False
@app.post("/items/")
async def create_item(item: Item):
    return item
```

这里的重点不是"能接收 JSON"，而是这行：

```python
item: Item
```

它表示：

- 这个接口从请求体中读取 JSON

- JSON 结构要匹配 `Item` 模型

- `name` 必须是字符串

- `price` 必须是浮点数

- `is_offer` 是可选布尔值，默认 `False`

如果请求数据不合法，FastAPI 会自动返回错误信息，而且会明确指出哪个字段有问题。这比手动写一堆 `if` 判断高效太多。

## 九、为什么 Pydantic 模型非常重要

很多人刚开始写 FastAPI 时，容易嫌模型麻烦，觉得直接收一个字典更快。短期看可能如此，但从项目维护角度看，Pydantic 模型价值非常大。

**1. 输入边界清晰**：你一眼就能看出一个接口到底需要什么字段。

**2. 自动校验**：不用再手动写大量字段判空和类型判断。

**3. 编辑器支持更好**：模型字段有自动补全，代码可读性明显更强。

**4. 自动文档**：请求体结构会自动出现在 Swagger 文档中。

**5. 更利于重构**：当字段变动时，你只要改模型，很多问题会在开发期就暴露出来。

所以在 FastAPI 里，模型绝不是负担，而是接口边界的核心组成部分。

## 十、路径参数、查询参数、请求体可以同时使用

FastAPI 很适合表达复杂接口，因为它能非常自然地把不同来源的数据组合在一个函数签名里。

例如：

```python
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI()
class Book(BaseModel):
    title: str
    price: float
@app.put("/books/{book_id}")
async def update_book(book_id: int, book: Book, notify: bool = False):
    return {
        "book_id": book_id,
        "book": book,
        "notify": notify
    }
```

这个接口里：

- `book_id` 来自路径参数

- `book` 来自请求体

- `notify` 来自查询参数

FastAPI 会自动识别各自的来源，不需要你手动指定。这正是它很高效的地方：**函数签名本身就在描述完整的请求结构**。

## 十一、响应模型：输出也要被约束

很多人学习接口开发时，比较重视输入校验，却忽略了输出约束。实际上，响应模型同样重要。

FastAPI 可以通过 `response_model` 对输出进行验证和过滤。

例如：

```python
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI()
class UserOut(BaseModel):
    username: str
    email: str
@app.get("/user/{user_id}", response_model=UserOut)
async def get_user(user_id: int):
    data = {
        "username": "tom",
        "email": "tom@example.com",
        "password": "123456"
    }
    return data
```

虽然返回的原始数据里有 `password` 字段，但最终响应里只会保留 `UserOut` 中声明的字段。

这件事非常关键，因为它意味着：

- 你可以从数据库里取完整对象

- 但对外接口只暴露允许返回的字段

- 不容易把敏感信息意外泄露出去

在真实项目里，一个非常推荐的做法是：**输入模型和输出模型分开**。比如注册接口输入模型包含密码，输出模型不包含密码；用户详情模型不暴露内部状态字段；列表页模型只返回简化字段。

## 十二、响应模型的工程价值

响应模型的价值不只是安全，还有很强的工程意义：

**1. 稳定前后端契约**：只要 `response_model` 不变，前端就能稳定依赖这些字段。

**2. 降低"顺手多返回几个字段"的风险**：没有响应模型时，很多接口容易因为图方便直接把数据库对象原样返回。

**3. 文档更可信**：文档展示的是你真正声明的输出结构，而不是"可能返回什么"。

**4. 更利于版本管理**：当接口升级时，可以通过模型清晰表达变化。

所以在 FastAPI 里，`response_model` 并不是可有可无的装饰，而是非常值得认真使用的能力。

## 十三、异常处理：错误也是 API 的一部分

一个成熟接口，不只要考虑成功返回什么，也要考虑失败时怎么返回。

FastAPI 最常见的错误处理方式是抛出 `HTTPException`：

```python
from fastapi import FastAPI, HTTPException
app = FastAPI()
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id != 1:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"item_id": item_id}
```

这个写法的好处是很直接：

- 条件不满足

- 立即中断

- 返回清晰的状态码和错误信息

对于 API 来说，错误响应不是"兜底补充"，而是接口行为的一部分。

## 十四、FastAPI 默认错误处理为什么好用

FastAPI 除了支持手动抛出 `HTTPException`，还会自动处理参数和请求体校验错误。

比如：

- 路径参数类型错误

- 查询参数缺失

- 请求体字段缺失

- 请求体字段类型不正确

这些情况，你不需要手动捕获，FastAPI 会直接返回结构化错误信息。

这种默认行为非常适合开发阶段，因为报错信息很清晰，定位问题很快。

当然，在企业项目中，很多团队会希望统一错误返回格式。这时就可以通过自定义异常处理器，把 FastAPI 默认异常统一包装成自己项目里的响应风格。

所以 FastAPI 的异常机制既有默认体验，也给你保留了足够的定制空间。

## 十五、依赖注入：FastAPI 最工程化的能力之一

如果说自动校验是 FastAPI 最直观的优点，那依赖注入就是它真正适合大型项目的原因之一。

先看一个简单例子：

```python
from typing import Annotated
from fastapi import FastAPI, Depends
app = FastAPI()
async def common_params(q: str | None = None, limit: int = 10):
    return {"q": q, "limit": limit}
@app.get("/items")
async def read_items(commons: Annotated[dict, Depends(common_params)]):
    return commons
```

这里的 `common_params` 就是一个依赖函数。

依赖函数可以：

- 接收参数

- 做数据处理

- 做校验

- 返回结果

- 被多个接口重复使用

## 十六、依赖注入到底适合做什么

依赖注入最常见的应用场景有：

**1. 通用分页参数**：很多列表接口都需要 `page、size、keyword`，可以抽出来复用。

**2. 当前用户信息**：先通过 token 获取当前登录用户，再把用户对象传给路由函数。

**3. 权限校验**：判断当前用户是否拥有管理员权限。

**4. 数据库会话**：每个请求创建数据库会话，结束时统一关闭。

**5. 公共查询逻辑**：例如排序规则、筛选条件解析。

依赖注入的本质，就是把"接口需要但不属于核心业务逻辑的内容"抽离出去，让接口函数本身更专注。这比把所有逻辑都写在一个函数里，要清晰得多。

## 十七、为什么依赖注入对大型项目很重要

项目越大，依赖注入越能体现价值：

**1. 复用能力强**：不需要在几十个接口里重复写同样的逻辑。

**2. 路由层更干净**：接口函数只处理核心业务，代码可读性明显更高。

**3. 更容易测试**：依赖可以独立替换或 mock。

**4. 逻辑职责更清晰**：权限、认证、数据库、业务逻辑可以自然分层。

FastAPI 的工程组织能力，很大程度上不是靠复杂类体系完成的，而是依赖函数加模块划分完成的。这一点很 Python，也很实用。

## 十八、中间件：对所有请求做统一处理

如果说依赖注入更适合"某类接口"的共享逻辑，那么中间件更适合"所有请求都要经过"的横切逻辑。

例如统计接口耗时：

```python
import time
from fastapi import FastAPI, Request
app = FastAPI()
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    cost = time.perf_counter() - start
    response.headers["X-Process-Time"] = str(cost)
    return response
```

中间件常见用途包括：

- 记录请求日志

- 统计请求耗时

- 注入统一响应头

- 做链路追踪

- 做全局异常记录

- 统一处理某些跨请求逻辑

> **区分要点**：
>
> - **依赖注入**：更适合接口级复用
> - **中间件**：更适合全局请求链处理
>
> 两者不是谁替代谁，而是作用层级不同。

## 十九、CORS：前后端分离项目绕不开的问题

当前后端不在同一个源下时，浏览器会触发跨域限制。FastAPI 里处理跨域最常见的方式就是使用 `CORSMiddleware`。

示例：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

这段配置允许指定前端地址跨域访问后端。

很多初学者一遇到跨域问题，就想直接写 `allow_origins=["*"]`。这在开发阶段有时能省事，但在实际项目中要谨慎，尤其当你需要携带 Cookie 或认证头时，更应该显式指定允许来源。

跨域问题本质上是浏览器安全模型问题，FastAPI 提供的是标准化配置能力。学习这部分时，不要把它当成框架"特殊坑"，而要理解它是 Web 开发的基础知识。

## 二十、后台任务：响应先返回，事情稍后做

有些操作不适合让用户一直等着，比如：

- 写日志

- 发送通知

- 记录邮件

- 做一些轻量级后处理

这时就可以使用 `BackgroundTasks`。

例如：

```python
from fastapi import FastAPI, BackgroundTasks
app = FastAPI()
def write_log(email: str, message: str):
    with open("notify.log", "a", encoding="utf-8") as f:
        f.write(f"{email}: {message}\n")
@app.post("/notify/{email}")
async def notify(email: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_log, email, "welcome")
    return {"msg": "task accepted"}
```

这里的逻辑是：

- 接口先快速返回

- 返回后再执行写日志任务

这对于轻量任务非常方便。但也要明确边界：`BackgroundTasks` 更适合小任务。如果是复杂、耗时、需要重试、需要分布式执行的任务，还是应该交给专门的任务队列系统。

## 二十一、认证与授权：先理解 token 依赖

FastAPI 在安全这块提供了很多基础组件。学习时最容易入门的一步，是理解通过依赖拿到 token。

例如：

```python
from typing import Annotated
from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordBearer
app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
@app.get("/profile")
async def read_profile(token: Annotated[str, Depends(oauth2_scheme)]):
    return {"token": token}
```

这里最关键的不是 OAuth2 名字本身，而是它和依赖注入的结合方式：

- 从请求头读取 Bearer Token

- 通过依赖注入传给接口函数

- 接口函数不需要自己手动解析请求头

接下来你可以在这个基础上继续扩展：

- 校验 token 是否有效

- 根据 token 获取当前用户

- 判断用户权限

- 实现登录接口和 JWT 生成

所以 FastAPI 的安全模块并不是"给你一整套黑盒权限系统"，而是提供了标准化组件，方便你按自己的业务方式拼装。

## 二十二、异步编程：什么时候用 async，什么时候用 def

FastAPI 建立在 ASGI 生态上，天然支持异步。但学习时一定不要把"异步"理解成"无脑更高级"。

**适合用 `async def` 的情况**：

- 调用异步数据库客户端

- 调用异步 HTTP 客户端

- 调用异步 Redis 客户端

- 需要 `await` 的库

**可以用普通 `def` 的情况**：

- 使用传统同步数据库库

- 使用阻塞型第三方 SDK

- 做一些简单同步处理

判断标准不是"我想不想写 async"，而是"你依赖的库本身是不是异步的"。

FastAPI 允许同步函数和异步函数混用，这一点很实用。对于初学者来说，不必一开始就强迫自己所有代码都异步化，而应该根据实际依赖来选择。

## 二十三、不要把异步神化

异步并不等于所有场景都更快。

它更适合的是 **I/O 密集型场景**，比如：

- 等数据库响应

- 等网络请求返回

- 等文件系统 I/O

- 等外部服务返回结果

如果你的业务是 **CPU 密集型计算**，比如大量数学运算、图像处理、复杂数据分析，那么改成 `async` 并不会自动变快。

学习 FastAPI 异步时，最重要的不是背概念，而是建立正确预期：

- 异步适合并发等待

- 异步不是性能万能药

- 正确使用比盲目统一风格更重要

## 二十四、WebSocket：FastAPI 不只适合 REST API

虽然很多人主要用 FastAPI 写 REST 接口，但它也支持 WebSocket。

例如：

```python
from fastapi import FastAPI, WebSocket
app = FastAPI()
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"you said: {data}")
```

这个例子展示了一个最简单的双向通信过程：

- 客户端建立 WebSocket 连接

- 服务端接收消息

- 服务端回发消息

WebSocket 适合的场景包括：

- 聊天室

- 实时通知

- 在线协作

- 实时看板

- 长连接推送

学习这部分时要理解：WebSocket 和普通 HTTP 接口是两种不同的通信方式。FastAPI 能同时支持它们，说明它不仅适合传统接口服务，也能覆盖部分实时应用场景。

## 二十五、项目变大后怎么组织代码

写 demo 时，一个文件够了；但只要项目稍微大一点，就必须拆分。

一个比较常见的结构如下：

```
app/
├── main.py
├── core/
│   ├── config.py
│   └── security.py
├── models/
│   └── user.py
├── schemas/
│   └── user.py
├── routers/
│   ├── users.py
│   └── articles.py
├── services/
│   └── user_service.py
└── dependencies/
    └── auth.py
```

各目录大致职责如下：

- **`main.py`**：应用入口，负责创建 app，注册路由、中间件和启动配置。

- **`routers/`**：放接口层代码，也就是路由函数。

- **`schemas/`**：放 Pydantic 模型，通常区分输入模型和输出模型。

- **`services/`**：放业务逻辑，不直接处理 HTTP 请求，而处理真正的业务。

- **`dependencies/`**：放依赖函数，比如当前用户、数据库会话、权限检查。

- **`core/`**：放全局配置、安全设置、基础设施相关代码。

这种分层的核心目的是：让 HTTP 层、业务层、模型层、基础设施层各司其职。

## 二十六、推荐的代码分层思路

对于 FastAPI 项目，推荐这样理解代码组织：

**1. 路由层只负责接口入口**：做参数接收、调用服务、返回结果，不堆业务细节。

**2. 业务层负责核心逻辑**：例如用户注册、订单计算、文章发布等。

**3. 模型层负责输入输出边界**：用 Pydantic 模型清晰描述数据结构。

**4. 依赖层负责可复用前置逻辑**：例如认证、数据库会话、分页参数。

**5. 配置层负责项目环境与基础设施**：例如配置文件读取、密钥、跨域设置等。

如果一开始就养成这种分层意识，项目后期会轻松很多。

## 二十七、测试：FastAPI 的测试体验很好

FastAPI 提供了 `TestClient`，可以很方便地做接口测试。

例如：

```python
from fastapi import FastAPI
from fastapi.testclient import TestClient
app = FastAPI()
@app.get("/")
async def read_main():
    return {"msg": "Hello World"}
client = TestClient(app)
def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"msg": "Hello World"}
```

这个测试不需要你真的把服务启动起来再手动请求，而是可以直接在测试代码中对应用对象发请求。

这对于持续集成和接口回归测试都非常有帮助。

## 二十八、FastAPI 项目测试建议

真实项目里，测试通常不止测一个接口能不能返回 200。比较推荐覆盖以下几类内容：

**1. 接口状态码测试**：例如是否正确返回 200、201、400、401、404。

**2. 参数校验测试**：例如字段缺失、字段类型错误时是否返回预期错误。

**3. 认证授权测试**：未登录能否访问，普通用户是否能访问管理员接口。

**4. 响应结构测试**：返回 JSON 是否符合 `response_model`。

**5. 依赖替换测试**：例如把数据库依赖替换成测试版或 mock。

FastAPI 在这方面的优势非常明显，因为依赖注入机制本身就天然利于测试替换。

## 二十九、部署：开发运行和生产运行不是一回事

很多初学者在本地运行成功后，就以为部署只是"换台机器再跑一次"。其实不是。

开发阶段常见目标是：

- 跑起来

- 自动重载

- 快速调试

生产阶段还要考虑：

- HTTPS

- 进程重启

- 多 worker

- 内存占用

- 日志记录

- 监控告警

- 服务扩缩容

所以学习 FastAPI 时，一定要理解：应用代码只是其中一层，真正上线还涉及运行环境和部署策略。

## 三十、Uvicorn 与生产部署的基本认识

FastAPI 本身是一个 ASGI 应用，通常需要通过 Uvicorn 这类 ASGI 服务器运行。

常见命令：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

这里的 `main:app` 表示：

- `main`：Python 文件名

- `app`：文件中的 FastAPI 实例对象

开发阶段常见会加上 `--reload`，它可以在代码变动时自动重启服务，非常方便。

但在生产环境里，一般**不建议**使用 `--reload`，因为它更适合开发调试，而不是稳定运行。

## 三十一、多进程、容器化与上线意识

当请求量上来后，单进程往往不够用。这时通常会考虑多 worker 运行，让服务更好利用多核 CPU。

再往前一步，很多项目会使用 Docker 做容器化部署。容器化的价值主要有：

- 环境一致

- 部署方便

- 隔离性更好

- 更利于持续交付

从学习角度看，部署至少要建立三个认识：

**1. FastAPI 应用不是"自己直接对外提供服务"**：它通常需要 Uvicorn 这类 ASGI 服务器承载。

**2. 生产部署关注的不只是能启动**：还要关注安全、监控、重启、扩容等问题。

**3. 容器化是现代部署中的高频方案**：FastAPI 和 Docker 的组合非常自然。

## 三十二、学习 FastAPI 时最该建立的几个思维

**1. 函数签名就是接口定义**：在 FastAPI 里，函数参数不仅是 Python 参数，也是接口参数说明。

**2. 模型就是边界**：请求模型定义输入边界，响应模型定义输出边界。

**3. 依赖注入不是高级技巧，而是常规工程能力**：凡是会在多个接口中重复出现的逻辑，都值得思考是否抽成依赖。

**4. 文档不是附赠品，而是主产品的一部分**：自动文档是 FastAPI 非常核心的能力，应该主动利用。

**5. 异步不是目的，合适才是目的**：是否使用 async，要看业务依赖和场景，而不是盲目追求形式统一。

## 三十三、FastAPI 适合什么样的项目

从学习和实践经验来看，FastAPI 非常适合这些场景：

**1. 前后端分离项目的后端接口**：比如管理系统、内容平台、后台服务接口。

**2. 微服务或内部 API 服务**：因为它轻量、清晰、开发效率高。

**3. 数据服务与 AI 服务接口**：FastAPI 在 Python 生态中和数据处理、机器学习、模型服务结合得很好。

**4. 快速验证业务的 MVP 项目**：写得快、调试方便、文档自动生成，适合快速交付。

**5. 需要工程规范但又不想太重的项目**：它比纯手写 Flask 更规范，又不像某些重框架那样有较高心智负担。

