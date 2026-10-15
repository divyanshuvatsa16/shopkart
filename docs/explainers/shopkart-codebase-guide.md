---
title: "ShopKart authentication codebase: line-by-line guide"
date: 2026-09-07
input_shape: concept
subject: "The current ShopKart customer authentication backend and frontend"
---

# ShopKart authentication codebase: line-by-line guide

This is a guided reading of the source code that makes the current ShopKart registration, login, profile, and logout flow work. It covers the handwritten application source, tests, configuration, and package manifests. It intentionally does **not** reproduce `.env` values, `package-lock.json`, or `frontend/dist/`: the first contains secrets, while the latter two are generated dependency/build output rather than code you are expected to explain in a lab viva.

## The whole request flow first

```mermaid
sequenceDiagram
  participant Browser as React app :5173
  participant API as Express API :5050
  participant DB as MongoDB Atlas
  Browser->>API: POST /customers/register (JSON)
  API->>DB: Customer.create(...)
  DB-->>API: Customer document; password is hashed by pre-save hook
  API-->>Browser: 201 safe customer object
  Browser->>API: POST /customers/login (email and password)
  API->>DB: Find customer including password hash
  API->>API: bcrypt.compare and jwt.sign
  API-->>Browser: 200 + Set-Cookie: token (HttpOnly)
  Browser->>API: GET /customers/me (cookie included)
  API->>API: verify JWT in middleware
  API->>DB: Find customer by token customerId
  API-->>Browser: safe profile object
  Browser->>API: POST /customers/logout (cookie included)
  API-->>Browser: clear token cookie
```

The browser and API deliberately use different ports: Vite serves the React page on `5173`, and Express serves data on `5050`. `credentials: "include"` on the browser side and `credentials: true` in backend CORS are the two halves that allow an HttpOnly login cookie to make the round trip.

## Backend: `backend/index.js`

This is the program entry point. It creates Express, installs middleware in the order requests need it, connects to MongoDB, then starts listening for HTTP requests.

| Line(s) | What it does |
|---|---|
| 1 | Loads Express. Express provides `express()` to create the web server and the middleware/router APIs used below. |
| 2 | Loads Mongoose, the library that connects Node.js code to MongoDB. |
| 3 | Loads `cookie-parser`. It reads the raw `Cookie` HTTP header and puts the result in `req.cookies`. |
| 4 | Loads `cors`, which adds the browser permission headers needed because frontend and backend use different origins (different ports). |
| 5 | Imports the customer router. That router owns all `/register`, `/login`, `/me`, and `/logout` route definitions. |
| 7 | Declares a helper that builds and returns the configured Express app. Keeping this separate makes the app easier to test without necessarily choosing a network port. |
| 8 | Calls `express()` to create one application object, stored as `app`. |
| 10–15 | Installs CORS middleware. `origin` allows the configured `FRONTEND_ORIGIN`, or Vite’s local default `http://localhost:5173`; `credentials: true` permits cookies on those cross-origin browser requests. This must run before routes so even preflight `OPTIONS` requests receive the headers. |
| 16 | Installs JSON body parsing. A JSON request body becomes `req.body`, which registration and login destructure later. |
| 17 | Installs cookie parsing. This is why the authentication middleware can read `req.cookies.token`. |
| 18 | Mounts `customerRoutes` under `/customers`. A router path such as `/login` therefore becomes `/customers/login`. |
| 20 | Returns the fully configured app to the caller. |
| 23 | Declares an asynchronous helper for opening the database connection. `async` lets the function wait for the connection to finish. |
| 24–26 | Stops early with a clear error if `MONGO_URI` was not set in `.env`. Without a URI, Mongoose cannot know which Atlas database to use. |
| 28 | Waits for Mongoose to connect using the URI. The server is not started until this completes successfully. |
| 31 | Declares the asynchronous startup function. |
| 32–34 | Verifies that the JWT signing secret exists. Signing with an absent secret would make authentication unsafe and broken. |
| 36 | Waits for MongoDB before accepting requests. |
| 38 | Selects `PORT` from the environment; uses `5000` only if it is absent. The current `.env` selects `5050`, which avoids a macOS service using port `5000`. |
| 39–41 | Creates the app and starts its HTTP listener. The callback logs only after the port is actually open. |
| 45 | Invokes startup. Because it is an async function, it returns a Promise. |
| 45–48 | Catches a rejected startup Promise, prints the error message, and exits with status `1` to tell the shell that startup failed. |
| 51 | Exports helpers. Other files/tests can import `createApp` and `connectDatabase`. Note: because startup is currently called unconditionally on line 45, importing this file also starts the server; the more test-friendly pattern is the `require.main === module` guard discussed earlier. |

## Backend: `backend/models/customer.model.js`

This file defines the shape of one MongoDB `customers` document and makes hashing automatic whenever a password is saved.

| Line(s) | What it does |
|---|---|
| 1 | Imports Mongoose so this file can define a schema and model. |
| 2 | Imports bcrypt, the one-way password hashing library. |
| 4 | Starts a `Schema`, Mongoose’s validation and document-shape definition. |
| 5 | Opens the object describing the stored fields. |
| 6–10 | Defines `fullName`: it must be a string, must be present, and `trim: true` removes leading/trailing spaces before storage. |
| 11–17 | Defines `email`: a required string. `unique: true` asks MongoDB for a unique index, `trim` removes outside spaces, and `lowercase` normalizes stored addresses. |
| 18–23 | Defines `password`: required string with at least six characters. `select: false` keeps it out of normal query results, helping prevent accidental API leaks. Login explicitly opts it back in. |
| 24–28 | Defines `phone` as a required, trimmed string. A string is appropriate because phone numbers are identifiers, not values you calculate with. |
| 30 | Enables Mongoose timestamps. It automatically adds `createdAt` and `updatedAt` fields. |
| 31 | Ends the schema definition. |
| 33 | Registers a `pre("save")` hook. Mongoose runs it just before a document is written with `.save()` or created through `Customer.create()`. `function`, not an arrow function, lets Mongoose set `this` to the document. |
| 34–36 | Checks whether the password changed. If it did not, `return` skips hashing; this prevents hashing an already-hashed password again on an unrelated update. |
| 38 | Replaces plaintext `this.password` with a bcrypt hash. The `10` is the salt-work factor: higher values are slower and cost more CPU. MongoDB receives only this hash. |
| 39 | Ends the hook. |
| 41 | Creates and exports the `Customer` model. Mongoose maps it to the `customers` collection and uses `customerSchema` for validation/hook behavior. |

## Backend: `backend/utils/generateToken.js`

This tiny utility keeps JWT construction in one place.

| Line(s) | What it does |
|---|---|
| 1 | Imports `jsonwebtoken`, the JWT creation/verification library. |
| 3 | Declares a function that receives the customer’s MongoDB id. |
| 4 | Calls `jwt.sign`. The payload is `{ customerId }`; the second argument is the secret used to sign it. The id is enough for the server to look up the customer later, and no password is put in the token. |
| 5 | Sets the expiry. It uses `JWT_EXPIRES_IN` when configured, otherwise one day (`"1d"`). |
| 6 | Ends the options object and signing call. The return value is a signed token string. |
| 7 | Ends the function. |
| 9 | Exports the function as this module’s value. |

## Backend: `backend/middlewares/auth.middleware.js`

This middleware is the gatekeeper for protected routes. It turns a valid cookie token into `req.user`.

| Line(s) | What it does |
|---|---|
| 1 | Imports JWT verification. |
| 2 | Imports the `Customer` model so the token id can be resolved to a current database customer. |
| 4 | Declares Express middleware. `req` is the incoming request, `res` builds a response, and `next` continues to the next handler. |
| 5 | Starts `try`; token verification and database access can both throw/reject. |
| 6 | Reads the cookie named `token`. This works because `cookie-parser` ran first in `index.js`. |
| 8–13 | If no token exists, ends the request with `401 Unauthorized`. `return` is important: it stops execution so `jwt.verify` is not called with no token. |
| 15 | Verifies the token’s signature and expiry using the same secret used to sign it. On success, `decoded` includes the earlier `customerId`; on bad/expired tokens it throws. |
| 16 | Looks up the customer id in MongoDB. Verification alone proves a token was signed; this query also ensures the referenced account still exists. |
| 18–23 | Returns the same generic `401` if no customer was found. It does not expose account details. |
| 25 | Attaches the database customer document to `req.user`. The protected controller can now use it without repeating authentication work. |
| 26 | Calls `next()` to hand the request to the protected route controller. |
| 27 | Catches invalid signatures, expired tokens, malformed tokens, and database errors that occurred inside the `try`. |
| 28–31 | Responds `401` for that failure path. For this lab, all token problems intentionally look the same to the client. |
| 32–33 | Ends `catch` and the middleware function. |
| 35 | Exports the middleware so the router can place it before protected controllers. |

## Backend: `backend/controllers/customer.controller.js`

Controllers contain the HTTP behavior: reading a request, using models/utilities, and sending a response.

### Imports and safe response helper

| Line(s) | What it does |
|---|---|
| 1 | Imports the customer model for database queries and creation. |
| 2 | Imports bcrypt for password comparison during login. Hashing itself is handled by the model hook. |
| 3 | Imports the JWT utility. |
| 5 | Declares a small mapper that accepts a Customer document. |
| 6–11 | Returns a new plain object containing only `_id`, `fullName`, `email`, and `phone`. There is deliberately no `password` property. Every controller that sends customer data uses this helper. |
| 12 | Ends the helper. |

### Registration: `POST /customers/register`

| Line(s) | What it does |
|---|---|
| 14 | Declares the asynchronous registration controller. |
| 15 | Starts `try` so database/validation failures are handled cleanly. |
| 16 | Pulls the four expected JSON properties from `req.body`. |
| 18–23 | If any value is falsy/missing, returns `400 Bad Request` with a simple validation message. |
| 25–30 | Enforces the lab’s six-character password minimum before database creation and returns `400` when it fails. |
| 32 | Searches for an existing normalized email. Lowercasing here matches the schema’s lowercase storage behavior. |
| 34–39 | Rejects a found customer with `409 Conflict`, the required duplicate-email status. |
| 41 | Creates the new document. Mongoose validates fields, then the pre-save hook hashes `password`, then the document is stored. |
| 43–47 | Sends `201 Created`, a success message, and the `customerResponse` safe object. The hash is never sent. |
| 48 | Starts catch handling. |
| 49–54 | Handles MongoDB duplicate-key error code `11000`. This protects against a race where two requests pass the earlier `findOne` check at the same time. |
| 56–59 | Handles other unexpected registration failures with `500 Internal Server Error`. |
| 60–61 | Ends the error handler and controller. |

### Login: `POST /customers/login`

| Line(s) | What it does |
|---|---|
| 63 | Declares the asynchronous login controller. |
| 64 | Begins error handling. |
| 65 | Reads `email` and `password` from the JSON request body. |
| 67 | Searches case-insensitively by applying optional chaining (`email?.`) before `toLowerCase()`, so a missing email does not crash immediately. `.select("+password")` overrides `select: false` only for this query because bcrypt must see the stored hash. |
| 68 | Evaluates to a customer-and-password-match result. If no customer exists, the left side is falsy and bcrypt is not called. Otherwise `bcrypt.compare` compares the supplied password (or empty string if absent) with the stored hash. |
| 70–75 | Returns the same `401 Invalid credentials` for an unknown email and wrong password. This avoids revealing which part was wrong. |
| 77 | Converts MongoDB’s id to a normal string and creates a signed JWT containing it. |
| 79 | Starts setting the `token` cookie on the HTTP response. |
| 80 | Makes the cookie HttpOnly, so frontend JavaScript cannot read it through `document.cookie`. The browser still sends it with eligible requests. |
| 81 | Requires HTTPS when `NODE_ENV` is `production`; local HTTP development remains possible. |
| 82 | Ends cookie options and writes the `Set-Cookie` header. |
| 84–87 | Sends the successful JSON response. The token is intentionally not included in JSON because it lives in the HttpOnly cookie. |
| 88–93 | Returns `500` for an unexpected login failure. |
| 94 | Ends the login controller. |

### Profile and logout

| Line(s) | What it does |
|---|---|
| 96 | Declares the profile controller. It is synchronous because authentication already loaded the customer. |
| 97 | Returns the safe representation of `req.user`, which authentication middleware attached. |
| 98 | Ends the profile controller. |
| 100 | Declares the logout controller. |
| 101 | Starts clearing the cookie with the same cookie name used by login. |
| 102–103 | Uses matching security options. Matching options help the browser identify the cookie to remove. |
| 104 | Finishes cookie clearing. |
| 106–109 | Sends the required successful logout response. |
| 110 | Ends logout. |
| 112–118 | Exports every controller/helper used elsewhere. The router imports the four route handlers; exporting `customerResponse` also makes the safe mapping reusable/testable. |

## Backend: `backend/routes/customer.routes.js`

This file maps HTTP method + URL path to controller functions.

| Line(s) | What it does |
|---|---|
| 1 | Imports Express to create a router. |
| 2–7 | Destructures the four controller functions from the controller module. |
| 8 | Imports the authentication middleware. |
| 10 | Creates an isolated router. `index.js` later mounts it at `/customers`. |
| 12 | Maps `POST /customers/register` to registration. No middleware means it is public. |
| 13 | Maps `POST /customers/login` to login. It is also public. |
| 14 | Maps `GET /customers/me`: middleware runs first, then profile runs only when `next()` is called after successful authentication. |
| 15 | Maps protected `POST /customers/logout` the same way. |
| 17 | Exports the router for mounting in `index.js`. |

## Frontend: `frontend/index.html`

Vite uses this one HTML document as the shell into which React renders.

| Line(s) | What it does |
|---|---|
| 1 | Declares modern HTML5. |
| 2 | Opens the root HTML element and declares English language for accessibility tools. |
| 3 | Opens document metadata. |
| 4 | Declares UTF-8 character encoding. |
| 5 | Makes layout use the device width and normal zoom on phones. |
| 6 | Provides a description for search engines and previews. |
| 7 | Sets the browser-tab title. |
| 8 | Closes metadata. |
| 9 | Opens the visible document body. |
| 10 | Provides the empty DOM node React will take over. |
| 11 | Loads the frontend entry module. `type="module"` enables ES module imports, and Vite transforms this source during development/build. |
| 12–13 | Close the body and document. |

## Frontend: `frontend/src/main.jsx`

| Line(s) | What it does |
|---|---|
| 1 | Imports React Strict Mode, a development helper that highlights unsafe patterns. |
| 2 | Imports React’s browser DOM renderer. |
| 3 | Imports `BrowserRouter`, which watches the URL and provides routing context. |
| 4 | Imports the application component. |
| 5 | Imports the global stylesheet. |
| 7 | Finds `<div id="root">` from `index.html`, creates a React root there, and begins rendering. |
| 8 | Wraps the app in Strict Mode. It has no production UI effect; development may intentionally re-run some checks. |
| 9 | Enables router hooks/components in all descendants. |
| 10 | Renders the app’s route definitions. |
| 11–13 | Close the router, Strict Mode wrapper, and render call. |

## Frontend: `frontend/src/App.jsx`

| Line(s) | What it does |
|---|---|
| 1 | Imports route components and `Navigate` for redirects. |
| 2–4 | Import the three page components. |
| 6 | Exports the top-level App component. |
| 7–8 | Starts JSX and `Routes`, which selects the best matching route. |
| 9 | Renders Register at `/register`. |
| 10 | Renders Login at `/login`. |
| 11 | Renders Home at `/home`. Home itself checks authentication. |
| 12 | Catches every unmatched route and redirects to `/login`. `replace` avoids adding the invalid URL to browser history. |
| 13–15 | Close Routes, JSX, and component. |

## Frontend: `frontend/src/components/FormField.jsx`

This component prevents the four form fields from repeating the same label/input/error markup.

| Line(s) | What it does |
|---|---|
| 1 | Exports a component and destructures its props. `type = "text"` supplies a default when callers omit it. |
| 2 | Begins returned JSX. |
| 3 | Uses a `<label>` wrapper. `htmlFor={name}` connects it to the input id, so clicking the label focuses the input. |
| 4 | Displays the readable label text. |
| 5 | Starts the input element. |
| 6–10 | Give the input matching id/name/type, a controlled `value`, and the parent’s `onChange` handler. Controlled means React state, not the DOM, is the source of truth. |
| 11 | Sets `aria-invalid` to true only when an error exists, helping screen readers. |
| 12 | Points assistive technology at the error text’s id when one exists; otherwise omits the attribute. |
| 13 | Ends the input. |
| 14 | Conditionally renders small error text only when `error` is truthy. The generated id matches line 12. |
| 15–17 | Close label, JSX, and component. |

## Frontend: `frontend/src/components/Navbar.jsx`

| Line(s) | What it does |
|---|---|
| 1 | Exports a navbar component that receives a logout callback and its loading state. |
| 2–3 | Starts the header JSX. |
| 4–6 | Renders a branded link to `/home`. |
| 7 | Renders a non-submitting button. Clicking invokes the passed `onLogout`; `disabled` prevents duplicate clicks while the request is in progress. |
| 8 | Shows feedback: `Logging out...` while busy, otherwise `Logout`. |
| 9–12 | Close button, header, JSX, and component. |

## Frontend: `frontend/src/services/api.js`

This is the browser’s one place for talking to Express.

| Line(s) | What it does |
|---|---|
| 1 | Chooses the API base URL. A Vite variable `VITE_API_URL` overrides the fallback; otherwise it calls the actual Express development port `5050`. |
| 3 | Declares a reusable async request helper. `options = {}` means callers can omit HTTP options. |
| 4 | Calls browser `fetch` on the base URL plus the endpoint path. `await` pauses this function until response headers arrive. |
| 5 | Crucial cookie setting: tells the browser to send eligible cookies and accept the login `Set-Cookie` response across the local frontend/API origins. |
| 6 | Declares JSON request content. GET/logout have no body, but the header is harmless for this prototype. |
| 7 | Spreads caller options afterwards, adding method/body or allowing an intentional override. |
| 8 | Ends fetch options. |
| 10 | Tries to parse JSON response data. If a non-JSON response occurs, `.catch(() => ({}))` substitutes an empty object so error handling still works. |
| 12 | Checks the HTTP status through Fetch’s `ok` boolean (true for 200–299). Fetch itself does not reject merely because a server returns 401/409. |
| 13 | Converts a server failure into a thrown JavaScript Error, preferring the API’s `message`. Components catch this. |
| 14 | Ends failure branch. |
| 16 | Returns parsed successful data to the calling component. |
| 17 | Ends shared helper. |
| 19 | Begins an exported registration helper that receives the form’s customer object. |
| 20 | Calls the common helper with the registration endpoint. |
| 21 | Selects POST. |
| 22 | Converts the customer object to the JSON text required for HTTP request bodies. |
| 23 | Ends call. |
| 25–29 | Defines login in the same pattern, posting credentials to `/customers/login`. The resulting HttpOnly cookie is stored by the browser, not read by this code. |
| 31 | Defines profile fetch. With no explicit method, Fetch uses GET. |
| 33–34 | Defines logout, calling the endpoint with POST so Express clears the cookie. |

## Frontend: `frontend/src/pages/Register.jsx`

| Line(s) | What it does |
|---|---|
| 1 | Imports `useState` for local form/UI state. |
| 2 | Imports a link and imperative navigation hook. |
| 3 | Imports the reusable field component. |
| 4 | Imports the backend registration function. |
| 6 | Defines the clean initial shape of the four registration fields. |
| 8 | Declares frontend validation. The backend still validates too; browser validation only improves user feedback. |
| 9 | Creates an initially empty error object. |
| 11 | Iterates through every `[field, value]` pair. |
| 12 | Records a required-field error when the trimmed value is empty. |
| 15–17 | Adds the matching six-character password rule when a password was supplied but is too short. |
| 19–20 | Returns errors and closes validator. |
| 22 | Exports Register page. |
| 23 | Gets `navigate`, used after successful registration. |
| 24 | Stores controlled field values, initially blank. |
| 25 | Stores individual client-validation errors. |
| 26 | Stores a server/API error string. |
| 27 | Stores whether a request is currently being submitted. |
| 29 | Declares one shared change handler. |
| 30 | Extracts changed input name/value from the browser event. |
| 31 | Copies existing form data and replaces only the changed named field. |
| 34 | Declares asynchronous submit handler. |
| 35 | Prevents normal browser form submission/reload. |
| 36 | Runs client validation. |
| 37 | Displays its results. |
| 38 | Clears an earlier backend error before the next attempt. |
| 40 | Stops before any network request when errors exist. |
| 42 | Sets busy state, disabling the button. |
| 43 | Begins handling API call outcome. |
| 44 | Sends the form to Express. |
| 45 | On success, moves the user to login (registration does not auto-login in this lab). |
| 46–47 | Stores the API’s message, such as duplicate email, when the request rejects. |
| 48–50 | Always turns off busy state, even if the request failed. |
| 51 | Ends submit handler. |
| 53–58 | Begins the accessible registration page/card and shows explanatory text. `aria-labelledby` points to its heading. |
| 59 | Starts form; `onSubmit` handles both click and Enter. `noValidate` disables native browser bubbles so custom messages are used. |
| 60–63 | Render four controlled fields, each receiving correct name, state value, shared handler, and field-specific error. `type` selects browser input behavior. |
| 64 | Shows an API error only when present, with `role="alert"` for screen reader announcement. |
| 65–67 | Renders submit button, disabling it while submitting and changing its text as feedback. |
| 68 | Closes form. |
| 69 | Gives existing customers a client-side link to Login. |
| 70–73 | Close card/page JSX and component. |

## Frontend: `frontend/src/pages/Login.jsx`

| Line(s) | What it does |
|---|---|
| 1–4 | Import state, routing tools, field component, and login API service. |
| 6 | Exports Login page. |
| 7 | Gets navigation function. |
| 8 | Holds the two controlled login fields. |
| 9 | Holds input/form errors. |
| 10 | Holds submit-busy state. |
| 12 | Declares shared input change handler. |
| 13–14 | Reads changed name/value and immutably updates only that form property. |
| 17 | Declares async form submit handler. |
| 18 | Stops browser reload. |
| 19 | Creates fresh validation errors. |
| 20–21 | Requires nonblank email and nonempty password. |
| 22 | Shows these client errors. |
| 24 | Does not call API if at least one error exists. |
| 26 | Turns on busy state. |
| 27 | Begins API outcome handling. |
| 28 | Sends credentials to backend. |
| 29 | On success, navigates Home. The browser already stored the HttpOnly token cookie from the response. |
| 30–31 | On any login failure, shows the generic `Invalid Credentials` text instead of revealing account details. |
| 32–34 | Turns busy state off on either outcome. |
| 37–42 | Starts login page/card and renders its heading/copy. |
| 43 | Starts custom-handled form. |
| 44–45 | Renders controlled email/password fields with input types and validation errors. |
| 46 | Conditionally renders a form-level accessible alert. |
| 47–49 | Renders a disabled-while-busy login button with changing text. |
| 50 | Closes form. |
| 51 | Links new visitors to registration. |
| 52–55 | Closes JSX and component. |

## Frontend: `frontend/src/pages/Home.jsx`

| Line(s) | What it does |
|---|---|
| 1 | Imports effect/state hooks. |
| 2 | Imports navigation hook. |
| 3 | Imports navbar. |
| 4 | Imports profile and logout API calls. |
| 6 | Exports Home page. |
| 7 | Gets navigation function. |
| 8 | Holds the authenticated customer, initially unknown. |
| 9 | Starts in loading state until profile attempt finishes. |
| 10 | Tracks logout request progress. |
| 12 | Runs an effect after initial render and if `navigate` reference changes. |
| 13 | Uses a local flag to prevent state/navigation updates after unmount. |
| 15 | Starts `GET /customers/me`; cookies are included by the shared API helper. |
| 16–18 | On success, stores the profile only if this component is still active. |
| 19–21 | On authentication/API failure, redirects to Login if still active. |
| 22–24 | In either case, finishes loading if active. |
| 26–28 | Cleanup runs on unmount and marks this effect inactive. |
| 29 | Declares the effect dependency. |
| 31 | Declares async logout click handler. |
| 32 | Shows logout-in-progress state. |
| 33 | Starts request outcome handling. |
| 34 | Calls backend logout; backend clears cookie. |
| 35 | Navigates to Login when it succeeds. |
| 36–38 | Clears busy state even if logout fails. |
| 39 | Ends handler. |
| 41–43 | Shows a loading page while profile check is unresolved. |
| 45 | Renders nothing once loading ends without a customer. Normally the redirect has already been scheduled; this avoids a profile flash. |
| 47–60 | Renders the authenticated home page: Navbar gets logout props, and the semantic `<dl>` shows name/email/phone from the safe profile API response. |
| 61–62 | Close JSX and component. |

## Frontend: `frontend/src/index.css`

This stylesheet has no authentication logic, but every line controls the UI users see.

| Line(s) | What it does |
|---|---|
| 1–5 | Sets global custom defaults: a font fallback stack, main text color, and page background. `:root` is the top document element. |
| 7 | Gives every element `border-box` sizing, so declared widths include padding/borders. |
| 8 | Removes browser body margin and prevents layouts narrower than 320 pixels. |
| 9 | Makes buttons/inputs inherit surrounding font settings. |
| 11 | Ensures auth, home, and loading containers fill at least the viewport height. |
| 12 | Centers the auth card with CSS Grid, adds spacing, and gives the auth page a light gradient. |
| 13 | Gives cards a responsive maximum width, padding, white surface, border, rounded corners, and shadow. |
| 14 | Sets heading spacing and responsive font size; `clamp` prevents it becoming too small/large. |
| 15 | Styles small uppercase blue eyebrow text. |
| 16 | Styles muted supporting copy and bottom spacing. |
| 17 | Makes each field a vertically spaced grid with bold label text/margin. |
| 18 | Styles inputs to fill their field with padding, border, rounded corners, and visible focus outline color. |
| 19 | Colors field/form errors red and makes them more readable. |
| 20 | Adds bottom space below a form-level error. |
| 21 | Styles primary buttons: full width, padding, no default border, blue background, white text, pointer cursor. |
| 22 | Changes disabled-button cursor/opacity. |
| 23 | Restyles secondary buttons (logout) as compact pale-blue controls. |
| 24 | Styles the auth-page link paragraph. |
| 25 | Sets common link color, weight, and removes underlines. |
| 26 | Lays out navbar items in a row, spaces them apart, and adds responsive horizontal padding/border. |
| 27 | Makes brand text larger, dark, and very bold. |
| 28 | Sets home background. |
| 29 | Centers profile card with responsive top/bottom margin. |
| 30 | Lays profile detail rows out vertically with gaps and top margin. |
| 31 | Styles each detail-row wrapper. |
| 32 | Styles definition labels (`dt`). |
| 33 | Styles definition values (`dd`) with controlled margin and boldness. |
| 34 | Centers loading text and styles it muted/bold. |
| 36 | Begins a media query for narrow screens. |
| 37 | Reduces card padding/corner radius on phones. |
| 38 | Reduces navbar padding on phones. |
| 39 | Ends media query. |

## Frontend testing

### `frontend/src/test/setup.js`

| Line(s) | What it does |
|---|---|
| 1 | Adds DOM-focused matchers such as `toBeInTheDocument()` to Vitest. |
| 2 | Imports React Testing Library cleanup. |
| 3 | Imports Vitest’s `afterEach` lifecycle function. |
| 5 | Cleans the rendered DOM after every test, preventing one test from leaking into another. |

### `frontend/src/services/api.test.js`

| Line(s) | What it does |
|---|---|
| 1 | Imports Vitest test helpers and `vi` mocking utilities. |
| 2 | Imports every API helper being tested. |
| 4 | Restores mocked globals after each test. |
| 6 | Groups related tests under `customer API`. |
| 7 | Declares async test for the cookie requirement. |
| 8 | Replaces global Fetch with a spy returning a successful fake JSON response. |
| 10–13 | Calls all four API helpers against the fake Fetch. |
| 15 | Ensures exactly four requests were made. |
| 16–19 | Ensures registration specifically targets port `5050` and passes `credentials: "include"`; this is the regression test for the previous port mismatch. |
| 20 | Checks each recorded call has the cookie credential option. |
| 21 | Ends test. |
| 23 | Starts error-message test. |
| 24 | Makes Fetch return a failed API response with a realistic message. |
| 26 | Confirms registration rejects/throws that same message. |
| 27–28 | Close test/group. |

### Component tests

| File and line(s) | What it does |
|---|---|
| `components/Navbar.test.jsx` 1–3 | Import testing helpers, Vitest helpers, and Navbar. |
| `components/Navbar.test.jsx` 5–11 | Render Navbar with a fake `onLogout`, click the accessible Logout button, then assert the callback ran exactly once. |
| `pages/Home.test.jsx` 1–4 | Import renderer/router/test tools and Home. |
| `pages/Home.test.jsx` 6–10 | Hoist fake `getCurrentCustomer`/`logoutCustomer` functions, then replace the real API module with those fakes before Home loads. |
| `pages/Home.test.jsx` 12–14 | Creates a reusable memory-router test rendering with `/home` and a visible fake `/login` target. |
| `pages/Home.test.jsx` 16–23 | Makes profile API succeed and asserts Home displays customer name/email/phone. |
| `pages/Home.test.jsx` 25–29 | Makes profile API reject and asserts navigation reaches the fake Login page. |
| `pages/Login.test.jsx` 1–4 | Import renderer/router/test helpers and Login. |
| `pages/Login.test.jsx` 6–7 | Hoist and mock `loginCustomer`. |
| `pages/Login.test.jsx` 9–11 | Creates a Login test renderer with a visible Home route. |
| `pages/Login.test.jsx` 13–21 | Makes login fail, fills fields, submits, and asserts the generic alert appears. |
| `pages/Login.test.jsx` 23–30 | Makes login succeed, fills fields, submits, and asserts navigation reaches Home. |
| `pages/Register.test.jsx` 1–4 | Import renderer/router/test helpers and Register. |
| `pages/Register.test.jsx` 6–7 | Hoist and mock `registerCustomer`. |
| `pages/Register.test.jsx` 9–11 | Creates a Register test renderer with visible Login target. |
| `pages/Register.test.jsx` 13–19 | Clicks an empty form’s submit button, asserts four required errors, and proves the API was not called. |
| `pages/Register.test.jsx` 21–30 | Makes registration succeed, fills all four fields, submits, and asserts navigation reaches Login. |

## Configuration and package manifests

### `.gitignore`

| Line(s) | What it does |
|---|---|
| 1 | Keeps `backend/.env` untracked so the Atlas URI and JWT secret do not end up in Git. |
| 2 | Keeps installed dependency folders out of Git; `package.json` and the lockfile are enough to recreate them. |

### `backend/.env` (values deliberately omitted)

| Variable | Purpose |
|---|---|
| `PORT` | Chooses the Express listening port. This project uses `5050` locally. |
| `MONGO_URI` | Secret MongoDB Atlas connection string passed to Mongoose. |
| `JWT_SECRET` | Secret used by both JWT signing and verification. It must never be committed or sent to the frontend. |
| `JWT_EXPIRES_IN` | Human-readable token lifetime such as `1d`. |
| `FRONTEND_ORIGIN` (optional) | Overrides the allowed browser origin in CORS; local fallback is `http://localhost:5173`. |

### `backend/package.json`

| Line(s) | What it does |
|---|---|
| 1 | Opens the JSON package manifest. |
| 2–4 | Give this package its name, version, and private status, preventing accidental npm publishing. |
| 5 | Starts runnable-script definitions. |
| 6 | `npm start`: launches Node, loads variables from `.env`, and runs `index.js`. |
| 7 | `npm run dev`: same server with Node watch mode, so source edits restart the process. |
| 8 | `npm test`: runs Node’s built-in test runner (when backend test files exist). |
| 9 | Ends scripts. |
| 10 | Starts production dependency list. |
| 11–16 | Declare bcrypt (hashing), cookie-parser (cookie parsing), cors (browser-origin permissions), express (HTTP framework), jsonwebtoken (JWTs), and mongoose (MongoDB models). Caret versions allow compatible updates. |
| 17–18 | End dependencies and manifest. |

### `frontend/package.json`

| Line(s) | What it does |
|---|---|
| 1 | Opens frontend package manifest. |
| 2–5 | Set frontend package name/version, prevent publishing, and declare ES-module syntax. |
| 6–10 | Define `npm run dev` (Vite development server), `npm run build` (production bundle), and `npm test` (Vitest suite). |
| 11–15 | Runtime dependencies: React, React DOM, and browser routing. |
| 16–23 | Development-only tooling: Testing Library, Vite React transform, jsdom browser simulation, Vite, and Vitest. |
| 24 | Ends manifest. |

### `frontend/vite.config.js`

| Line(s) | What it does |
|---|---|
| 1 | Imports Vite configuration helper. |
| 2 | Imports Vite’s React plugin, which understands JSX and React fast refresh. |
| 4 | Exports the Vite configuration. |
| 5 | Enables the React plugin. |
| 6 | Opens Vitest configuration. |
| 7 | Uses jsdom to simulate browser APIs/DOM during component tests. |
| 8 | Loads the shared test setup after Vitest starts. |
| 9–10 | Close test and Vite configuration. |

## The key safety boundaries to remember in a viva

| Concern | Where the code enforces it |
|---|---|
| Password is never stored as plaintext | Customer pre-save hook: `bcrypt.hash` before MongoDB write. |
| Password is not normally fetched | Schema `select: false`; login temporarily requests it only to compare. |
| Password is never returned | `customerResponse()` explicitly whitelists four safe fields. |
| Login does not reveal whether email exists | Both unknown email and wrong password receive the same `401 Invalid credentials`. |
| Protected routes require a real session | Router runs `authenticateCustomer`; it verifies token then looks up the customer. |
| Frontend JavaScript cannot read the JWT | Login uses an HttpOnly cookie. |
| Browser cookies work across local ports | Frontend uses `credentials: "include"`; backend permits frontend origin and credentials through CORS. |

## Check yourself

1. During registration, what exact sequence keeps a plaintext password out of MongoDB?
2. Why does login use `.select("+password")` even though API responses must never include passwords?
3. What has to happen before `getMyProfile` can rely on `req.user`?
4. If the frontend called `localhost:5000` while Express listens on `5050`, why can the browser report a CORS error even though the CORS setup in Express is correct?

### Answers

1. `Customer.create` creates a Mongoose document; its `pre("save")` hook sees the password changed and replaces it with `bcrypt.hash(...)` before the document is written. A weak answer that says only “bcrypt encrypts it” misses that bcrypt hashes one way and that the schema hook is where the replacement occurs.
2. The schema’s `select: false` prevents accidental password retrieval. Login is the one legitimate case needing the stored hash, so it opts in only for its lookup, compares it with bcrypt, and then sends only a success message. A weak answer would send the queried document directly, which risks leaking the hash.
3. The router must run `authenticateCustomer`; it reads the parsed token cookie, verifies it with `JWT_SECRET`, fetches the customer by the payload’s `customerId`, sets `req.user`, and calls `next()`. A token alone is not the complete flow because the current customer lookup matters too.
4. CORS headers come from the server that receives the request. Port `5000` was a different macOS service, so it returned its own response without Express CORS headers. Calling the actual API on `5050` reaches the middleware configured in `index.js`.
