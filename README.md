# MERN Bookstore -- Documentație Tehnică

## 1. Prezentare Generală

Aplicația **MERN Bookstore** este o platformă e-commerce completă pentru
gestionarea unui catalog online de cărți. Proiectul utilizează stack-ul
**MERN (MongoDB, Express.js, React.js, Node.js)** și este împărțit în
două repo‑uri: - Backend: mern-bookstore-backend - Frontend:
mern-bookstore-frontend

## 2. Obiective Tehnice

-   Arhitectură web modernă cu React 18, Node.js, Express.
-   Interfață responsive cu CSS Grid, Flexbox și efecte hover.
-   Autentificare securizată și panou de administrare.
-   Funcționalități e-commerce: coș de cumpărături, total dinamic.
-   Navigare cu React Router.
-   API RESTful complet și extensibil.

## 3. Funcționalități

-   Catalog interactiv de produse cu imagini și informații detaliate.
-   Efecte hover: ISBN, editura, număr pagini, anul publicării.
-   Coș de cumpărături persistent.
-   Panou de administrare (CRUD complet).
-   Design responsive (1--5 coloane).
-   Backend REST extensibil pentru integrarea plăților.

## 4. Tehnologii Utilizate

### Frontend

-   React 18, React Router DOM
-   Vite
-   CSS3 (Grid, Flexbox)

### Backend

-   Node.js, Express.js
-   CORS middleware

### Stocare

-   Fișiere JSON (scalabil către MongoDB)

## 5. Metodologie Agile

Proiectul a urmat o abordare Agile cu dezvoltare iterativă și feedback
continuu.

### Sprint-uri

1.  CRUD produse
2.  UI/UX îmbunătățit
3.  Coș de cumpărături
4.  Panou administrare + autentificare
5.  Responsivitate și optimizări

### Flux dezvoltare

``` mermaid
graph LR
A[Planificare] --> B[Design]
B --> C[Implementare]
C --> D[Testare]
D --> E[Evaluare]
E --> F[Retrospectiva]
F --> G[Sprint Urmator]
G --> A
```

## 6. Arhitectură Aplicație

``` mermaid
graph TB
subgraph Frontend - React
A[React Components] --> B[React Router]
B --> C[Fetch API Calls]
end

subgraph Backend - Node + Express
C --> D[Express Server]
D --> E[REST Endpoints]
E --> F[JSON/MongoDB Storage]
end

subgraph External Services
X[Image CDN] --> A
Y[Payment Gateway] --> D
end
```

## 7. Arhitectura Componentelor React

``` mermaid
graph TB
App --> Catalog
App --> AdminLogin
App --> AdminPanel

Catalog --> SearchFilter
Catalog --> SidebarCart
Catalog --> ProductCard
```

## 8. Documentație API

### Produse

  Metodă   Endpoint            Descriere
  -------- ------------------- ---------------------
  GET      /api/products       Toate produsele
  GET      /api/products/:id   Un produs
  POST     /api/products       Creează produs
  PUT      /api/products/:id   Actualizează produs
  DELETE   /api/products/:id   Șterge produs

### Coș

  Metodă   Endpoint        Descriere
  -------- --------------- -----------------
  POST     /api/cart       Adaugă în coș
  GET      /api/cart       Conținut coș
  DELETE   /api/cart/:id   Elimină din coș

## 9. Rute Frontend

  Rută               Componentă              Descriere
  ------------------ ----------------------- ----------------------
  /                  BookCatalog             Pagina principală
  /admin/login       AdminLogin              Autentificare
  /admin/products    ProductAdministration   Administrare produse
  /payment-success   PaymentSuccess          Confirmare plată

## 10. Concluzii

MERN Bookstore reprezintă o aplicație web completă, extensibilă,
modernă, construită pe principii Agile și arhitectură scalabilă,
pregătită pentru integrarea plăților și migrarea completă către MongoDB.
