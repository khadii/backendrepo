require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { supabase } = require('./supabaseClient');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(bodyParser.json());

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'User Management API',
      version: '1.0.0',
      description: 'API for managing users, including signup, profile fetching, and more',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./index.js'], // Points to where the documentation comments are written
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullname
 *       properties:
 *         auth_user_id:
 *           type: string
 *           description: UUID of the user in Supabase Auth
 *         email:
 *           type: string
 *           description: User's email address
 *         fullname:
 *           type: string
 *           description: User's full name
 *         profile_picture:
 *           type: string
 *           description: URL of the user's profile picture
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The time when the user was created
 */

/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Sign up a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               fullname:
 *                 type: string
 *                 example: "John Doe"
 *               profilePicture:
 *                 type: string
 *                 example: "https://example.com/profile.jpg"
 *     responses:
 *       200:
 *         description: Successfully signed up
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Error during sign up
 */

/**
 * @swagger
 * /profile/{authUserId}:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: authUserId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the user in Supabase Auth
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fullname:
 *                   type: string
 *                   description: User's full name
 *                 profile_picture:
 *                   type: string
 *                   description: URL of the user's profile picture
 *                 email:
 *                   type: string
 *                   description: User's email address
 *       500:
 *         description: Error retrieving user profile
 */

/**
 * @swagger
 * /complete-profile/{authUserId}:
 *   get:
 *     summary: Get complete user profile from both Supabase Auth and custom users table
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: authUserId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the user in Supabase Auth
 *     responses:
 *       200:
 *         description: Complete user profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   description: User's email address
 *                 fullname:
 *                   type: string
 *                   description: User's full name
 *                 profile_picture:
 *                   type: string
 *                   description: URL of the user's profile picture
 *       500:
 *         description: Error retrieving complete user profile
 */
/**
 * @swagger
 * /signin:
 *   post:
 *     summary: Sign in an existing user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Successfully signed in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 user:
 *                   type: object
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Error during sign-in
 */


app.post('/signup', async (req, res) => {
  const { email, password, fullname, profilePicture } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const authUserId = data.user.id;

  const { error: dbError } = await supabase
    .from('users')
    .insert([{ auth_user_id: authUserId, email, fullname, profile_picture: profilePicture }]);

  if (dbError) {
    return res.status(500).json({ error: dbError.message });
  }

  res.status(200).json(data);
});

app.get('/profile/:authUserId', async (req, res) => {
  const { authUserId } = req.params;

  const { data, error } = await supabase
    .from('users')
    .select('fullname, profile_picture, email')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
});

app.get('/complete-profile/:authUserId', async (req, res) => {
  const { authUserId } = req.params;

  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(authUserId);
  
  if (authError) {
    return res.status(500).json({ error: authError.message });
  }

  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('fullname, profile_picture')
    .eq('auth_user_id', authUserId)
    .single();

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  const userProfile = {
    email: authData.email,
    fullname: profileData.fullname,
    profile_picture: profileData.profile_picture,
  };

  res.status(200).json(userProfile);
});
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.status(200).json({
    access_token: data.session.access_token,
    user: data.user,
  });
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// // includes auth post requirement instance

// {const jwt = require('jsonwebtoken');

// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) return res.sendStatus(401); // No token found

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//     if (err) return res.sendStatus(403); // Invalid token
//     req.user = user;
//     next(); // Pass control to the next handler
//   });
// };

// app.post('/login', (req, res) => {
//   const { username, password } = req.body;

//   // Authenticate user (e.g., check username and password against your database)
  
//   const user = { name: username }; // Example user object
//   const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

//   res.json({ accessToken });
// });

// const swaggerOptions = {
//   swaggerDefinition: {
//     openapi: '3.0.0',
//     info: {
//       title: 'User Management API',
//       version: '1.0.0',
//       description: 'API for managing users, including signup, profile fetching, and more',
//     },
//     servers: [
//       {
//         url: 'http://localhost:3000',
//       },
//     ],
//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: 'http',
//           scheme: 'bearer',
//           bearerFormat: 'JWT',
//         },
//       },
//     },
//     security: [
//       {
//         bearerAuth: [],
//       },
//     ],
//   },
//   apis: ['./index.js'],
// };
// }








// adding post to hearder
// const jwt = require('jsonwebtoken');

// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) return res.sendStatus(401); // No token found

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//     if (err) return res.sendStatus(403); // Invalid token
//     req.user = user;
//     next(); // Pass control to the next handler
//   });
// };

// app.post('/signup', authenticateToken, async (req, res) => {
//   const { email, password, fullname, profilePicture } = req.body;

//   const { data, error } = await supabase.auth.signUp({
//     email,
//     password,
//   });

//   if (error) {
//     return res.status(500).json({ error: error.message });
//   }

//   const authUserId = data.user.id;

//   const { error: dbError } = await supabase
//     .from('users')
//     .insert([{ auth_user_id: authUserId, email, fullname, profile_picture: profilePicture }]);

//   if (dbError) {
//     return res.status(500).json({ error: dbError.message });
//   }

//   res.status(200).json(data);
// });







// //  includes delete instance
// {
//   require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const { supabase } = require('./supabaseClient');
// const swaggerJsDoc = require('swagger-jsdoc');
// const swaggerUi = require('swagger-ui-express');

// const app = express();
// app.use(bodyParser.json());

// // Swagger setup
// const swaggerOptions = {
//   swaggerDefinition: {
//     openapi: '3.0.0',
//     info: {
//       title: 'User Management API',
//       version: '1.0.0',
//       description: 'API for managing users, including signup, profile fetching, and more',
//     },
//     servers: [
//       {
//         url: 'http://localhost:3000',
//       },
//     ],
//   },
//   apis: ['./index.js'], // Points to where the documentation comments are written
// };

// const swaggerDocs = swaggerJsDoc(swaggerOptions);
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// /**
//  * @swagger
//  * components:
//  *   schemas:
//  *     User:
//  *       type: object
//  *       required:
//  *         - email
//  *         - password
//  *         - fullname
//  *       properties:
//  *         auth_user_id:
//  *           type: string
//  *           description: UUID of the user in Supabase Auth
//  *         email:
//  *           type: string
//  *           description: User's email address
//  *         fullname:
//  *           type: string
//  *           description: User's full name
//  *         profile_picture:
//  *           type: string
//  *           description: URL of the user's profile picture
//  *         created_at:
//  *           type: string
//  *           format: date-time
//  *           description: The time when the user was created
//  */

// /**
//  * @swagger
//  * /signup:
//  *   post:
//  *     summary: Sign up a new user
//  *     tags: [User]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               email:
//  *                 type: string
//  *                 example: "user@example.com"
//  *               password:
//  *                 type: string
//  *                 example: "password123"
//  *               fullname:
//  *                 type: string
//  *                 example: "John Doe"
//  *               profilePicture:
//  *                 type: string
//  *                 example: "https://example.com/profile.jpg"
//  *     responses:
//  *       200:
//  *         description: Successfully signed up
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/User'
//  *       500:
//  *         description: Error during sign up
//  */

// /**
//  * @swagger
//  * /profile/{authUserId}:
//  *   get:
//  *     summary: Get user profile
//  *     tags: [User]
//  *     parameters:
//  *       - in: path
//  *         name: authUserId
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: UUID of the user in Supabase Auth
//  *     responses:
//  *       200:
//  *         description: User profile retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 fullname:
//  *                   type: string
//  *                   description: User's full name
//  *                 profile_picture:
//  *                   type: string
//  *                   description: URL of the user's profile picture
//  *                 email:
//  *                   type: string
//  *                   description: User's email address
//  *       500:
//  *         description: Error retrieving user profile
//  */

// /**
//  * @swagger
//  * /complete-profile/{authUserId}:
//  *   get:
//  *     summary: Get complete user profile from both Supabase Auth and custom users table
//  *     tags: [User]
//  *     parameters:
//  *       - in: path
//  *         name: authUserId
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: UUID of the user in Supabase Auth
//  *     responses:
//  *       200:
//  *         description: Complete user profile retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 email:
//  *                   type: string
//  *                   description: User's email address
//  *                 fullname:
//  *                   type: string
//  *                   description: User's full name
//  *                 profile_picture:
//  *                   type: string
//  *                   description: URL of the user's profile picture
//  *       500:
//  *         description: Error retrieving complete user profile
//  */

// /**
//  * @swagger
//  * /delete-user/{authUserId}:
//  *   delete:
//  *     summary: Delete a user
//  *     tags: [User]
//  *     parameters:
//  *       - in: path
//  *         name: authUserId
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: UUID of the user in Supabase Auth
//  *     responses:
//  *       200:
//  *         description: User deleted successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: "User deleted successfully"
//  *       500:
//  *         description: Error deleting user
//  */

// app.post('/signup', async (req, res) => {
//   const { email, password, fullname, profilePicture } = req.body;

//   const { data, error } = await supabase.auth.signUp({
//     email,
//     password,
//   });

//   if (error) {
//     return res.status(500).json({ error: error.message });
//   }

//   const authUserId = data.user.id;

//   const { error: dbError } = await supabase
//     .from('users')
//     .insert([{ auth_user_id: authUserId, email, fullname, profile_picture: profilePicture }]);

//   if (dbError) {
//     return res.status(500).json({ error: dbError.message });
//   }

//   res.status(200).json(data);
// });

// app.get('/profile/:authUserId', async (req, res) => {
//   const { authUserId } = req.params;

//   const { data, error } = await supabase
//     .from('users')
//     .select('fullname, profile_picture, email')
//     .eq('auth_user_id', authUserId)
//     .single();

//   if (error) {
//     return res.status(500).json({ error: error.message });
//   }

//   res.status(200).json(data);
// });

// app.get('/complete-profile/:authUserId', async (req, res) => {
//   const { authUserId } = req.params;

//   const { data: authData, error: authError } = await supabase.auth.admin.getUserById(authUserId);
  
//   if (authError) {
//     return res.status(500).json({ error: authError.message });
//   }

//   const { data: profileData, error: profileError } = await supabase
//     .from('users')
//     .select('fullname, profile_picture')
//     .eq('auth_user_id', authUserId)
//     .single();

//   if (profileError) {
//     return res.status(500).json({ error: profileError.message });
//   }

//   const userProfile = {
//     email: authData.email,
//     fullname: profileData.fullname,
//     profile_picture: profileData.profile_picture,
//   };

//   res.status(200).json(userProfile);
// });

// app.delete('/delete-user/:authUserId', async (req, res) => {
//   const { authUserId } = req.params;

//   const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUserId);
//   if (deleteAuthError) {
//     return res.status(500).json({ error: deleteAuthError.message });
//   }

//   const { error: deleteDbError } = await supabase
//     .from('users')
//     .delete()
//     .eq('auth_user_id', authUserId);

//   if (deleteDbError) {
//     return res.status(500).json({ error: deleteDbError.message });
//   }

//   res.status(200).json({ message: 'User deleted successfully' });
// });

// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });

// }