import { MongoClient, ObjectID } from "mongodb";
import { GraphQLServer } from "graphql-yoga";

import "babel-polyfill";

const usr = "bvillarreal";
const pwd = "123";
const url = "cluster0-qr8a1.mongodb.net/test?retryWrites=true&w=majority";

/**
 * Connects to MongoDB Server and returns connected client
 * @param {string} usr MongoDB Server user
 * @param {string} pwd MongoDB Server pwd
 * @param {string} url MongoDB Server url
 */
const connectToDb = async function(usr, pwd, url) {
  const uri = `mongodb+srv://${usr}:${pwd}@${url}`;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await client.connect();
  return client;
};

/**
 * Starts GraphQL server, with MongoDB Client in context Object
 * @param {client: MongoClinet} context The context for GraphQL Server -> MongoDB Client
 */
const runGraphQLServer = function(context) {
  const typeDefs = `
    type Query{
      getAuthor(id: ID!): Author
      getAuthors: [Author]!
      getRecipe(ingid: ID!): [Recipe]!
      getRecipes: [Recipe]!
      getIngredients: [Ingredient]!
    }
    type Mutation{
      addAuthor(name: String!, email: String!): Author!
      addIngredient(name: String!): Ingredient!
      addRecipe(name: String!, description: String!, author: ID!, ingredients: [ID!]): Recipe!
      delRecipe(id: ID!): String!
      delIngredient(id: ID!): String!
      delAuthor(id: ID!): String!
      updateAuthor(id: ID!, name: String, email: String): Author!
      updateIngredient(id: ID!,name: String, recipes: [ID]): Ingredient!
      updateRecipe(id: ID!, name: String, description: String, author: ID, ingredients: [ID]): Recipe!
    }
    type Recipe {
      _id: ID!
      name: String!
      description: String!
      author: Author!
      ingredients: [Ingredient!]
    }
    type Author {
      _id: ID!
      name: String!
      email: String!
      recipes: [Recipe]!
    }
    type Ingredient {
      _id: ID!
      name: String!
      recipes: [Recipe]!
    }
    `;

  const resolvers = {
    Recipe: {
      author: async(parent,args,ctx,info) => {
        const author = parent.author;
        const {client} = ctx;
        const db = client.db("recetario");
        const collection = db.collection("authors");
        const result = await collection.findOne({_id: ObjectID(author)});
        return result;
      },
      ingredients: async(parent, args, ctx, info) =>{
        const ingredients = parent.ingredients.map(elem => ObjectID(elem));
        const {client} = ctx;
        const db = client.db("recetario");
        const collection = db.collection("ingredients");
        const result = await collection.find({_id:{$in: ingredients}}).toArray();
        return result;
      }
    },
    Author: {
      recipes: async(parent,args,ctx,info) => {
        const author = parent._id;
        const {client} = ctx;
        const db = client.db("recetario");
        const collection = db.collection("recetas");
        const result = await collection.find({author: author}).toArray();
        return result;
      } 
    },
    Ingredient: {
      recipes:async(parent,args,ctx,info) => {
        const ingredient = parent._id;
        const {client} = ctx;
        const db = client.db("recetario");
        const collection = db.collection("recetas");
        const result = await collection.find({ingredients: ingredient}).toArray();
        return result;
      } 
    },
    Query: {
      getAuthor: async (parent, args, ctx, info) => {
        const { _id } = args;
        const { client } = ctx;
        const db = client.db("recetario");
        const collection = db.collection("authors");
        const result = await collection.findOne({ _id: ObjectID(_id) });
        return result;
      },
      getAuthors: async (parent, args, ctx, info) => {
        const { client } = ctx;
        const db = client.db("recetario");
        const collection = db.collection("authors");
        const result = await collection.find({}).toArray();
        return result;
      },
      getRecipe: async (parent, args, ctx, info) => {
        const { ingid } = args;
        const { client } = ctx;
        const db = client.db("recetario");
        const collection = db.collection("recetas");
        const result = await collection.find({ ingredients: ObjectID(ingid) }).toArray();
        return result;
      },
      getRecipes: async (parent, args, ctx, info) => {
        const { client } = ctx;
        const db = client.db("recetario");
        const collection = db.collection("recetas");
        const result = await collection.find({}).toArray();
        return result;
      },
      getIngredients: async (parent, args, ctx, info) => {
        const { client } = ctx;
        const db = client.db("recetario");
        const collection = db.collection("ingredients");
        const result = await collection.find({}).toArray();
        return result;
      },
    },
    Mutation: {
      addAuthor: async (parent, args, ctx, info) => {
        const { name, email } = args;
        const { client } = ctx;

        const db = client.db("recetario");
        const collection = db.collection("authors");
        const result = await collection.insertOne({ name, email });

        return {
          name,
          email,  
          _id: result.ops[0]._id
        };
      },      
      addIngredient: async(parent, args, ctx, info) => {
        const { name } = args;
        const { client } = ctx;

        const db = client.db("recetario");
        const collection = db.collection("ingredients");
        const result = await collection.insertOne({name});

        return {
          name,
          _id: result.ops[0]._id
        }
      },
      addRecipe: async(parent, args, ctx, info) => {
        const {name, description, author, ingredients} = args;
        const { client } = ctx;

        const db = client.db("recetario");
        const collection = db.collection("recetas");
        const result = await collection.insertOne({
          name, 
          description, 
          author: ObjectID(author), 
          ingredients: ingredients.map(elem => ObjectID(elem))
        });

        return{
          name,
          description,
          author: ObjectID(author),
          ingredients: ingredients.map(elem => ObjectID(elem)),
          _id: result.ops[0]._id
        }
      },
      updateAuthor: async(parent, args, ctx, info) =>{
        const {id, name, email} = args;
        const { client } = ctx;

        const db = client.db("recetario");
        const collection = db.collection("authors")
        const old = await collection.find({_id: ObjectID(id)}).toArray();
        const result = await collection.updateOne({_id: ObjectID(id)},
        { name: name || old.name, 
          email: email || old.email
        });
        return result;
      },
      updateRecipe: async(parent, args, ctx, info) =>{
        const {id, name, description, author, addingredients, delingredient} = args;
        const { client } = ctx;

        const db = client.db("recetario");
        const collection = db.collection("recetas");
        const old = await collection.find({_id: ObjectID(id)}).toArray();
        const result = await collection.updateOne({_id: ObjectID(id)},
        { name: name || old.name, 
          description: description || old.description, 
          author: ObjectID(author) || old.author, 
          ingredients: ingredients || old.ingredients
        });
        return result;
      },
      updateIngredient: async(parent, args, ctx, info) =>{
        const {id, name, recipes} = args;
        const { client } = ctx;

        const db = client.db("recetario");
        const collection = db.collection("ingredients");
        const old = collection.find({_id: ObjectID(id)});
        const result = collection.updateOne({_id: ObjectID(id)},
        { name: name || old.name,
          recipes: recipes || old.recipes
        });
        return result;
      },
      delRecipe: async(parent, args, ctx, info) =>{
        const {id} = args;
        const { client } = ctx;

        const db = client.db("recetario");
        await db.collection("recetas").deleteOne({_id: ObjectID(id)});
        return "Receta eliminada"
      },
      delAuthor: async(parent, args, ctx, info) =>{
        const {id} = args;
        const { client } = ctx;

        const db = client.db("recetario");
        await db.collection("authors").deleteOne({_id: ObjectID(id)});
        await db.collection("recetas").deleteMany({author: ObjectID(id)}) 
        return "Author eliminado"
      },
      delIngredient: async(parent, args, ctx, info) =>{
        const {id} = args;
        const { client } = ctx;

        const db = client.db("recetario");
        const ing = db.collection("ingredients")
        await ing.deleteOne({_id: ObjectID(id)})
        const rec = db.collection("recetas")
        await rec.deleteMany({ingredients:{$in:ObjectID(id)}});
        return "Ingrediente eliminado"
      }
    }
  };

  const server = new GraphQLServer({ typeDefs, resolvers, context });
  const options = {
    port: 4000
  };

  try {
    server.start(options, ({ port }) =>
      console.log(
        `Server started, listening on port ${port} for incoming requests.`
      )
    );
  } catch (e) {
    console.info(e);
    server.close();
  }
};

const runApp = async function() {
  const client = await connectToDb(usr, pwd, url);
  console.log("Connect to Mongo DB");
  try {
    runGraphQLServer({ client });
  } catch (e) {
    console.log(e)
    client.close();
  }
};

runApp();
