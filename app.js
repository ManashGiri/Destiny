const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const cors = require("cors");
const passport = require("passport");
const passportLocal = require("passport-local");
const { saveRedirectUrl, isLoggedIn, isAdmin } = require("./middleware");
const User = require("./models/user");
const Upload = require("./models/package.js");
const multer = require('multer');
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });

if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

app.use(cors());

const MONGO_URL = process.env.DB_URL || "mongodb://localhost:27017/destiny";

main()
    .then(() => {
        console.log("Connected to DB successfully");
        // Setup basic Express middleware first
        setupExpressBasics();
        // Then initialize Passport
        initializePassport();
        // Finally setup routes
        setupRoutes();
    })
    .catch((err) => {
        console.log("Database connection error:", err);
        console.log("Continuing without database - some features may not work");
        setupExpressBasics();
        initializePassport();
        setupRoutes();
    });

async function main() {
    try {
        await mongoose.connect(MONGO_URL);
    } catch (error) {
        console.log("MongoDB connection failed:", error);
        throw error;
    }
}

function setupExpressBasics() {
    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));
    app.use(express.urlencoded({ extended: true }));
    app.use(methodOverride("_method"));
    app.engine("ejs", ejsMate);
    app.use(express.static(path.join(__dirname, "assets")));
    app.use(express.static(path.join(__dirname, "public")));
    console.log("Express basics configured");
}

function initializePassport() {
    try {
        const LocalStrategy = require('passport-local').Strategy;
        passport.use(new LocalStrategy(User.authenticate()));
        passport.serializeUser(User.serializeUser());
        passport.deserializeUser(User.deserializeUser());
        console.log("Passport initialized successfully");
    } catch (error) {
        console.log("Error initializing passport:", error);
    }
}

function setupRoutes() {
    // Custom middleware for flash messages and user data
    app.use((req, res, next) => {
        res.locals.success = req.flash("success");
        res.locals.error = req.flash("error");
        res.locals.curUser = req.user;
        next();
    });

    app.get("/", (req, res) => {
        res.send("Hi, I am root");
    });

    app.get("/test-passport", (req, res) => {
        res.json({
            passportInitialized: !!passport._strategies.local,
            reqLogin: typeof req.login,
            reqLogout: typeof req.logout,
            reqUser: req.user,
            session: req.session ? "exists" : "none",
            flashSuccess: req.flash("success"),
            flashError: req.flash("error")
        });
    });

    // ... rest of routes will be added here
    console.log("Routes setup complete");
}

// Express basics are now configured in setupExpressBasics()
const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    crypto: {
        secret: process.env.SECRET || "defaultsecret",
    },
    touchAfter: 24 * 60 * 60,
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

// Temporarily use memory store instead of MongoDB store
const sessionOptions = {
    // store,  // Comment out MongoDB store
    secret: process.env.SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
}

app.use(session(sessionOptions));
app.use(flash());

// Passport middleware - will be initialized after DB connection
app.use(passport.initialize());
app.use(passport.session());

// Routes will be set up after passport initialization

function setupRoutes() {
    // Custom middleware for flash messages and user data
    app.use((req, res, next) => {
        res.locals.success = req.flash("success");
        res.locals.error = req.flash("error");
        res.locals.curUser = req.user;
        next();
    });

    app.get("/show/:id", isLoggedIn, async (req, res) => {
        const package = await Upload.findById(req.params.id);
        res.render('show.ejs', { package });
    });

    app.get("/", (req, res) => {
        res.send("Hi, I am root");
    });

    app.get("/test-passport", (req, res) => {
        res.json({
            passportInitialized: !!passport._strategies.local,
            reqLogin: typeof req.login,
            reqLogout: typeof req.logout,
            reqUser: req.user,
            session: req.session ? "exists" : "none",
            flashSuccess: req.flash("success"),
            flashError: req.flash("error")
        });
    });

    app.get("/index", (req, res) => {
        res.render("index.ejs");
    });

    app.get("/about", (req, res) => {
        res.render("about.ejs");
    });

    app.get("/blog", (req, res) => {
        res.render("blog.ejs");
    });

    app.get("/contact", (req, res) => {
        res.render("contact.ejs");
    });

    app.get("/honeymoon", async (req, res) => {
        const packages = await Upload.find({});
        res.render("honeymoon.ejs", { packages });
    });

    app.get("/india_trips", (req, res) => {
        res.render("india_trips.ejs");
    });

    app.get("/international_trips", (req, res) => {
        res.render("international_trips.ejs");
    });

    app.get("/login", (req, res) => {
        res.render("login.ejs");
    });

    app.get("/signup", (req, res) => {
        res.render("signup.ejs");
    });

    app.post('/signup', saveRedirectUrl, async (req, res) => {
        try {
            console.log("Signup attempt:", req.body);
            let { email, username, password } = req.body;
            let role = 'user';
            let newUser = new User({ email, username, role });
            let registeredUser = await User.register(newUser, password);
            console.log("User registered successfully:", registeredUser);

            // Check if req.login is available
            console.log("req.login available:", typeof req.login);
            console.log("passport session:", req.session ? req.session.passport : "no session");

            req.login(registeredUser, (err) => {
                console.log("req.login callback called");
                if (err) {
                    console.log("Login error:", err);
                    // req.flash("error", "Registration successful but login failed. Please try logging in.");
                    console.log("Registration successful but login failed");
                    return res.redirect("/login");
                }
                console.log("Login successful");
                req.flash("success", `Welcome to Destiny, ${username}!`);
                console.log(`Welcome to Destiny, ${username}!`);
                let redirectUrl = res.locals.redirectUrl || "/index";
                res.redirect(redirectUrl);
            });
        } catch (e) {
            console.log("Registration error:", e);
            req.flash("error", e.message);
            console.log("Registration error:", e.message);
            res.redirect("/signup");
        }
    });

    app.post('/login', saveRedirectUrl, (req, res, next) => {
        console.log("Login attempt for:", req.body ? req.body.username : "no body");
        console.log("Passport authenticate function:", typeof passport.authenticate);

        const authMiddleware = passport.authenticate("local", {
            failureRedirect: "/login",
            // failureFlash: true
        });

        console.log("Auth middleware:", typeof authMiddleware);

        return authMiddleware(req, res, next);
    }, async (req, res) => {
        console.log("Login successful for user:", req.user);
        let { username, password } = req.body;
        req.flash("success", `Hi ${username}, now you're all set to explore!`);
        console.log(`Hi ${username}, now you're all set to explore!`);
        let redirectUrl = res.locals.redirectUrl || "/index";
        res.redirect(redirectUrl);
    });

    app.get('/logout', (req, res, next) => {
        req.logout((err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Thank you for visiting us. Have a nice day!");
            res.redirect("/index");
        });
    });

    app.post('/package', isLoggedIn, isAdmin, upload.single('uploads[image]'), async (req, res) => {
        console.log(req.body.uploads);
        let uploads = req.body.uploads;
        let url = req.file.path;
        let filename = req.file.filename;
        const newUpload = new Upload(uploads);
        newUpload.image = { url, filename };
        await newUpload.save();
        req.flash("success", "New Upload Posted!");
        res.redirect("/contact");
    });

    app.use((err, req, res, next) => {
        console.log("Error caught by error handler:", err);
        let { statusCode = 500, message = "Something went wrong" } = err;
        if (res.headersSent) {
            console.log("Headers already sent, cannot send error response");
            return;
        }
        res.status(statusCode).render("includes/error.ejs", { err });
    });

    console.log("Routes setup complete");
}

app.listen(3000, () => {
    console.log("Server is listening to port 3000");
});