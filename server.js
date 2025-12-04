/**
 * MERN BOOKSTORE E-COMMERCE API v1
 * Server Express.js pentru magazinul online de cărți cu funcționalități complete e-com
 * Funcționalități implementate:
 * – Catalog de produse (cărți) cu prețuri și stocuri
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')
('sk_test_51SQVN3PE8DtyAGp0Bb4o6nYr2f5hriRkz9A82hNzcfUzX4CW5EfFKYW6FptAq6HsmEFNjV2OBTuCSiF4vZzuQcPQ00qgeTbKzR');



// Inițializarea aplicației Express
const app = express();
const PORT = 3000;

// Configurarea middleware-ului de bază
app.use(cors({
  origin: '*', // PERMITE TOATE ORIGIN-URILE
  credentials: true
}));



app.use(express.json()); // Parser pentru JSON în request body




// Căile către fișierele de date
const PRODUCTS_FILE = path.join(__dirname, 'data', 'books.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const CART_FILE = path.join(__dirname, 'data', 'cart.json');


/**
 * =================================
 * FUNCȚII HELPER PENTRU GESTIUNEA DATELOR
 * =================================
 */

/**
 * Funcție helper pentru citirea produselor din fișierul JSON
 * @returns {Array} Array-ul cu produsele sau array gol în caz de eroare
 */
const readProducts = () => {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    const parsedData = JSON.parse(data);
    return parsedData.products || [];
  } catch (error) {
    console.error('Eroare la citirea produselor:', error);
    return [];
  }
};

/**
 * Funcție helper pentru citirea utilizatorilor din fișierul JSON
 * @returns {Object} Obiect cu array-ul de utilizatori
 */
const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Eroare la citirea utilizatorilor:', error);
    // Returnează structură goală dacă fișierul nu există
    return { users: [] };
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token invalid' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};






/**
 * Functie helper pentru citirea cosului din fisierul JSON
 * @returns {Object} Obiectul coș sau structură default
 */

const readCart = () => {
  try {
    const data = fs.readFileSync(CART_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    //Returnează coș gol dacă fișierul nu există
    return {
      items: [],
      total: 0,
      totalItems: 0,
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Funcție de helper pentru salvarea coșului în fișierul JSON
 * @param {Object} cart - Obiectul coș de salvat
 */

const saveCart = (cart) => {
  try {
    cart.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CART_FILE, JSON.stringify(cart, null, 2));
  } catch (error) {
    console.error('Eroare la salvarea coșului:', error);
    throw error;
  }
};






/**
 * =================================
 * API ROUTES PENTRU PRODUSE
 * =================================
 */

/**
 * RUTA GET /api/products - Obține toate produsele active cu opțiuni de filtrare
 * Parametri de interogare:
 * - category: filtrare după categorie
 */
app.get('/api/products', (req, res) => {
  try {
    let products = readProducts();

    // Filtrare dupa produsele active
    products = products.filter(p => p.isActive === true);

    // Filtrare după categorie
    if (req.query.category) {
      products = products.filter(p =>
        p.category.toLowerCase() === req.query.category.toLowerCase()
      );
    }

    res.json({
      success: true,
      products,
      total: products.length,
      filters: {
        category: req.query.category
      }
    });

  } catch (error) {
    console.error('Eroare la obținerea produselor:', error);
    res.status(500).json({ success: false, message: 'Eroare server' });
  }
});

/**
 * RUTA POST /api/cart - Adaugă un produs în coș
 * Body: { productId, quantity}
 */

  app.post('/api/cart', (req, res) => {
    try{
      const { productId, quantity = 1 } = req.body;

      if (!productId) {
        return res.status(400).json({
          success:false,
          message: 'ID produs este obligatoriu'
        });
      }

    //Citește produsele pentru a verifica existența
    const products = readProducts();
    const product = products.find(p => p.id === productId && p.isActive === true);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produsul nu a fost găsit'
      });
    }

    if (product.stock < quantity ) {
        return res.status(400).json ({
          success: false,
          message: 'Stoc insuficient'
        });
    }

    //Citește coșul existent sau creează unul nou
    const cart = readCart();

    //Verifică dacă produsul există deja în coș
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    if (existingItemIndex > -1) {
      //Actualizează cantitatea
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      //Adaugă produs nou în coș
      cart.items.push({
        productId,
        quantity,
        title: product.title,
        author: product.author,
        price:product.discountPrice || product.price,
        imageUrl: product.imageUrl,
        addedAt: new Date().toISOString()
      });
    }

    //Reccalculează totalul

    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    //Salvează coșul actualizat
    saveCart(cart);

    res.json({
      success:true,
      message: 'Produs adăugat în coș',
      cart: cart
    });

    } catch (error) {
      console.error('Eroare la adăugarea în coș:', error);
      res.status(500).json ({
        success:false,
        message:'Eroare server la adăugarea în coș'
      });
    }
  });

/**
 * RUTA GET /api/cart - Obține conținutul coșului
 */

app.get('/api/cart', (req, res) => {
  try {
    const cart = readCart();
    res.json({
      success: true,
      cart: cart
    });
  } catch (error) {
    console.error('Eroare la obținerea coșului:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare server la obținerea coșului'
    });
  }
});


/**
 * RUTA DELETE /api/cart/productId - Șterge un produs din coș
 */
app.delete('/api/cart/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const cart = readCart();

    // Convertim productId la number
    const productIdNum = Number(productId);

    // Filtrează cărțile din coș, eliminând pe cel cu productId-ul dorit
      cart.items = cart.items.filter(item => item.productId !== productIdNum);

    // Recalculează totalul 
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    saveCart (cart);
   
    res.json({
      success: true,
      message: 'Produs șters din coș',
      cart: cart 
    });
  } catch (error) {
    console.error('Eroare la ștergerea din coș:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare server la ștergerea din coș'
    });
  }
});

/**
 * RUTA POST /api/create-checkout-session - creează sesiune Stripe Checkout
 */

app.post('/api/create-checkout-session', async (req, res) => {
  try{
    const { amount, cartItems} = req.body;

    console.log('creează sesiune checkout pentru suma de:', amount);

    //validări
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Suma invalida'
      });
    }

    // creează rânduri pentru produse
    const lineItems = [
      ...cartItems.map(item => ({
        price_data: {
          currency: 'ron',
          product_data: {
            name:item.title,
            description: 'de ${item.author}',
            images: [item.imageUrl],
          },
          unit_amount: Math.round(item.price * 100), //preț per unitate 
          //deoarece Stripe lucrează în subunități: RON -> BANI (1 RON = 100 bani)
        },
        quantity: item.quantity,
      })),
      // adăugăm transportul
      {
        price_data: {
          currency: 'ron',
          product_data: {
            name: 'Transport',
            description: 'Cost livrare',
          },
          unit_amount: 1999, // 19.99 RON
        },
        quantity: 1,
      }
    ];

    // creează sesiunea Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&clear_cart=true`,
      cancel_url: `${req.headers.origin}/`,
      metadata: {
        order_type: 'book_store'
      },
    });

    console.log('Sesiune checkout creata:', session.id);

    res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url
    });

  } catch (error) {
    console.error('Eroare Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la crearea sesiunii de plată'
    });
  }
});


// app.get... (pag 3- lab 5)
app.get('/check-payment-status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({
      success: true,
      paymentStatus: session.payment_status,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Eroare verificare plată'
    });
  }
});

/** 
 * RUTA POST /api/clear-cart - Golește coșul
*/
app.post('/api/clear-cart', async (req, res) => {
  try {
    const cart = await readCart();

    // sterge toate produsele din coș
    cart.items = [];
    cart.total = 0;
    cart.totalItems = 0;

    saveCart (cart);

    res.json({
      success: true,
      message: 'Coș golit cu succes'
    });

  } catch (error) {
    console.error('Eroare la golirea coșului:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare server la golirea coșului'
    });
  }
});



// Pasul 1. Extinderea rutei existente /api/products din backend/server.js

app.get('/api/products', (req, res) => {
  try{
    let products = readProducts();

    //Filtrare dupa produsele active
    products = products.filter(p => p.isActive === true);

    //Filtrare dupa categorie 
    if (req.query.category) {
        products = products.filter(p =>
          p.category.toLowerCase()
        );
    }

    // ===Cautare dupa titlu sau autor ===

    if (req.query.search) {
        const keyword = req.query.search.toLowerCase();
        products = products.filter(p =>
          p.title.toLowerCase().includes(keyword) ||
          p.author.toLowerCase().includes(keyword)
        );
    }

// ===Sortare ===

    if (req.query.sort) {
    switch (req.query.sort) {
case 'price-asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'title=asc':
          products.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'title-desc':
          products.sort((a, b) => b.title.localeCompare(a.title));
          break;
      } 
    }

    res.json({
      success:true,
      products,
      total: products.length,
      filters: {
        category: req.query.category || null,
        search: req.query.search || null,
        sort: req.query.sort || null 
      }
    });
  } catch (error) {
      console.error('Eroare la obținerea produselor:', error);
      res.status(500).json({ success: false, message: 'Eroare server'});
  }
});


/**
 * RUTA POST /api/admin/login – Login pentru admin
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Încercare login admin:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email și parolă sunt obligatorii'
      });
    }


const usersData = readUsers();
const user = usersData.users.find(u => u.email === email && u.role === 'admin');

if (!user) {
  console.log('Utilizator admin negăsit:', email);
  return res.status(401).json({
    success: false,
    message: 'Acces restricționat – doar administratori'
  });
}

const isPasswordValid = await bcrypt.compare(password, user.password);

if (!isPasswordValid) {
  console.log('Parolă incorectă pentru:', email);
  return res.status(401).json({
    success: false,
    message: 'Parolă incorectă'
  });
}

const token = jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  },
  process.env.JWT_SECRET || 'fallback_secret',
  { expiresIn: '8h' }
);

console.log('Login admin reușit:', email);

res.json({
  success: true,
  message: 'Autentificare admin reușită',
  token,
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  }
});

} catch (error) {
  console.error('Eroare la login admin:', error);
  res.status(500).json({
    success: false,
    message: 'Eroare server la autentificare'
  });
}
  });


/**
 * RUTA POST /api/admin/products – Adaugă produs nou cu TOATE câmpurile
 */
app.post('/api/admin/products', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      title,
      author,
      price,
      description,
      imageUrl,
      category,
      stock,
      discountPrice,
      isbn,
      publisher,
      pages,
      year,
      rating,
      reviewCount,
      tags,
      featured
    } = req.body;

    console.log('Date primite pentru produs nou:', req.body);

    // VALIDĂRI OBLIGATORII
    const requiredFields = ['title', 'author', 'price', 'stock'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Câmpuri obligatorii lipsă: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // VALIDĂRI SUPLIMENTARE
    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Prețul nu poate fi negativ'
      });
    }

    if (stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stocul nu poate fi negativ'
      });
    }

    if (discountPrice && discountPrice > price) {
      return res.status(400).json({
        success: false,
        message: 'Prețul redus nu poate fi mai mare decât prețul original'
      });
    }

    const products = readProducts();

    // GENERARE ID INCREMENTAT
    const lastProduct = products[products.length - 1];
    const newId = lastProduct ? lastProduct.id + 1 : 1;

    // CREEAZĂ PRODUS NOU CU TOATE CÂMPURILE
    const newProduct = {
      id: newId,
      title: title.trim(),
      author: author.trim(),
      isbn: isbn?.trim() || '',
      category: category?.trim() || 'General',
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      description: description?.trim() || '',
      imageUrl: imageUrl?.trim() || '/images/default-book.jpg',
      stock: parseInt(stock),
      isActive: true,
      featured: featured || false,
      rating: rating ? parseFloat(rating) : null,
      reviewCount: reviewCount ? parseInt(reviewCount) : 0,
      tags: tags || [],
      specifications: {
        pages: pages?.toString() || '',
        language: "Romanian",
        publisher: publisher?.trim() || '',
        year: year?.toString() || '',
        format: "Paperback"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    // ADAUGĂ PRODUSUL
    products.push(newProduct);

    // SALVEAZĂ ÎN FIȘIER
    const productsData = { products };
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(productsData, null, 2));

    console.log('Produs adăugat cu succes:', newProduct.id);

    res.status(201).json({
      success: true,
      message: 'Produs adăugat cu succes',
      product: newProduct
    });

  } catch (error) {
    console.error('Eroare la adăugarea produsului:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare server la adăugarea produsului',
      error: error.message
    });
  }
});

/**
 * RUTA GET /api/admin/products – Obține toate produsele pentru admin (cu filtre)
 * 
 * Parametri interogare:
 * - category: filtrare după categorie
 * - search: căutare în titlu/autor
 * - status: active/inactive (all pentru toate)
 * - page: paginare
 * - limit: număr produse per pagină
 */
app.get('/api/admin/products', authenticateToken, requireAdmin, (req, res) => 
  { 
  try {
    const { search, status = 'all', sortBy = 'createdAt',} = req.query;

    let products = readProducts();

    // Filtre utile
    if (status === 'active') {
      products = products.filter(p => p.isActive);
    } else if (status === 'inactive') {
      products = products.filter(p => !p.isActive);
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      products = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm) ||
        p.author.toLowerCase().includes(searchTerm)
      );
    }

    //Sortare
    if (sortBy === 'title') {
      products.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'price') {
      products.sort((a, b) => new Date(b.createdAt) - new
    Date(a.createdAt));
    }


    res.json({
      success: true,
      products: products,
      statistics: {
      total: products.length,
      active: products.filter(p => p.isActive).length,
      outOfStock: products.filter(p => p.stock === 0).length
    }
    });



} catch (error) {
  console.error('Eroare la obținerea produselor admin:', error);
  res.status(500).json({
    success: false,
    message: 'Eroare server la obținerea produselor'
  });
  }


});


// am ramas aici si trebuie testatpag.9 si 10 .. iat apoi de adaugat de la ruta PUT 12.6


/**
 * RUTA PUT /api/admin/products/:id – Actualizează produs
 */
app.put('/api/admin/products/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const updates = req.body;

        let products = readProducts();
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Produsul nu a fost găsit'
            });
        }

        // Actualizează produsul
        products[productIndex] = {
            ...products[productIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify({ products }, null, 2));

        res.json({
            success: true,
            message: 'Produs actualizat cu succes',
            product: products[productIndex]
        });

    } catch (error) {
        console.error('Eroare la actualizarea produsului:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare server la actualizarea produsului'
        });
    }
});



/**
 * RUTA DELETE /api/admin/products/:id – Șterge sau dezactivează produs
 */
app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { permanent = false } = req.query; // soft delete vs hard delete

        let products = readProducts();
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Produsul nu a fost găsit'
            });
        }


        if (permanent) {
            // Ștergere permanentă
            products.splice(productIndex, 1);
            message = 'Produs șters definitiv';
        } else {
            // Soft delete (dezactivează)
            products[productIndex].isActive = false;
            products[productIndex].updatedAt = new Date().toISOString();
            message = 'Produs dezactivat cu succes';
        }

        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify({ products }, null, 2));

        res.json({
            success: true,
            message
        });

    } catch (error) {
        console.error('Eroare la ștergerea produsului:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare server la ștergerea produsului'
        });
    }
});


/**
 * RUTA GET /api/admin/products/:id – Obține un singur produs
 */
app.get('/api/admin/products/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const products = readProducts();
        const product = products.find(p => p.id === productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produsul nu a fost găsit'
            });
        }

        res.json({
            success: true,
            product
        });

    } catch (error) {
        console.error('Eroare la obținerea produsului:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare server la obținerea produsului'
        });
    }
});







 // RUTA GET / - Informații despre API
 //
app.get('/', (req, res) => {
  res.json({
    message: 'MERN BookStore API v1',
    description: 'API simplu pentru catalogul de cărți',
    version: '1.0.0',
    endpoints: {
      'GET /api/products': 'Obține toate produsele active',
      'GET /api/products?category=React': 'Filtrare după categorie'
    },
    author: 'SDBIS'
  });
});

// Pornirea serverului
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('\n MERN BookStore API v1');
    console.log(` Serverul rulează pe: http://localhost:${PORT}`);
    console.log(` Endpoint: http://localhost:${PORT}/api/products`);
    console.log('\n Server pregătit pentru utilizare!');
  });
}

// Exportă aplicația pentru testare
module.exports = app;

/*
 // testare API endpoint
 # curl "http://localhost:3000/api/products" | head -20

 # testare filtrare după categorie
 # curl "http://localhost:3000/api/products?category=React" | jq '.total'

 # testare endpoint principal /
 # curl "http://localhost:3000/" | jq
 # testarea poate fi realizată și din browser, Thunder Client, Postman
*/




// testare cautare // curl"http://localhost:3000/api/products?search=React" | jq // testare sortare 
// // curl "http://localhost:3000//api/products?sort=price_desc" | testare combinata 
// // curl "http://localhost:3000//api/products?category=React&search=React&sort=title_asc" | jq 
// // testarea poate fi realizata si din browser, Thunder Client, Postman
 



