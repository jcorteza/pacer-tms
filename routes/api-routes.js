// Requiring our models and passport as we've configured it
const db = require("../models");
const passport = require("../config/passport");
const fs = require("fs");
let batches = require("../batches.json");
const checkKey = require("../checkKey");

module.exports = function(app) {
    // Using the passport.authenticate middleware with our local strategy.
    // If the user has valid login credentials, send them to the members page.
    // Otherwise the user will be sent an error
    app.post("/api/login", passport.authenticate("local"), function(req, res) {
        // Since we're doing a POST with javascript, we can't actually redirect that post into a GET request
        // So we're sending the user back the route to the members page because the redirect will happen on the front end
        // They won't get this or even be able to access this page if they aren't authed
        let employee = req.user.dataValues;
        res.json(employee);
    });

    // Route for signing up a user. The user's password is automatically hashed and stored securely thanks to
    // how we configured our Sequelize User Model. If the user is created successfully, proceed to log the user in,
    // otherwise send back an error
    app.post("/api/signup", function(req, res) {
        console.log(req.body);
        db.User.create({
            username: req.body.username,
            password: req.body.password,
            employeeType: req.body.employeeType
        })
            .then(function() {
                res.redirect(201, "/success");
            })
            .catch(function(err) {
                console.log(err);
                // res.json(err);
                res.status(422).json(err.errors[0].message);
            });
    });

    app.get("/api/batches", function(_, res) {
        // let batchesData = JSON.stringify(batches);
        // console.log(JSON.stringify(batches, null, 2));
        res.status(200).json(batches);
    });

    app.put("/api/batches", function(req, res) {
        const token = checkKey(batches);
        batches[token] = req.body;
        // batches.push({ [token]: req.body });
        fs.writeFile(
            "public/batches.json",
            JSON.stringify(batches),
            "utf-8",
            function(err) {
                if (err) {
                    return res.status(500).send({
                        error:
                            "Something went wrong trying to save the information submitted. Please try again later."
                    });
                }
                console.log("batches.json updated");
                res.status(201).send({
                    success: "Form successfully submited."
                });
            }
        );
    });

    // Route for logging user out
    app.get("/logout", function(req, res) {
        req.logout();
        res.redirect("/");
    });

    // Route for getting some data about our user to be used client side
    app.get("/api/user_data", function(req, res) {
        if (!req.user) {
            // The user is not logged in, send back an empty object
            res.json({});
        } else {
            // Otherwise send back the user's email and id and employeeType
            // Sending back a password, even a hashed password, isn't a good idea
            res.json({
                username: req.user.username,
                id: req.user.id,
                employeeType: req.user.employeeType
            });
        }
    });

    app.post("/api/newData", function(req, res) {
        db.Product.create(req.body.info.products)
            .then(function(newProduct) {
                console.log(req.body.info.so);
                console.log(JSON.stringify(req.body.info));
                db.SO.findOrCreate({ where: req.body.info.so })
                    .then(function(newSO) {
                        newProduct.setSO(newSO[0]);
                        db.PO.findOrCreate({ where: req.body.info.po })
                            .then(function(newPO) {
                                // eslint-disable-next-line prettier/prettier
                                newPO[0].getSOs().then((salesOrders) => {
                                    if (!salesOrders.includes(newSO[0])) {
                                        newPO[0].setSOs([
                                            ...salesOrders,
                                            newSO[0]
                                        ]);
                                    }
                                });
                                delete batches[req.body.key];
                                fs.writeFile(
                                    "public/batches.json",
                                    JSON.stringify(batches),
                                    "utf-8",
                                    function(err) {
                                        if (err !== null) {
                                            console.log(
                                                "Something went wrong trying to update the batches.json file."
                                            );
                                            console.log(
                                                `Error: ${JSON.stringify(err)}`
                                            );
                                        } else {
                                            console.log("batches.json updated");
                                        }
                                    }
                                );
                                res.status(200).json({
                                    message: "Submission successfull."
                                });
                            })
                            .catch(function(error) {
                                console.log(error);
                                res.status(500).json(error);
                            });
                    })
                    .catch(function(error) {
                        console.log(error);
                        res.status(500).json(error);
                    });
            })
            .catch(function(error) {
                console.log(error);
                res.status(500).json(error);
            });
    });

    app.get("/api/manager", function(req, res) {
        let managerData = {};
        db.Product.findAll()
            .then(function(products) {
                // eslint-disable-next-line curly
                if (products.length !== 0) {
                    managerData.products = products;
                }
                db.PO.findAll()
                    .then(function(purchaseOrders) {
                        // eslint-disable-next-line curly
                        if (purchaseOrders.length !== 0) {
                            managerData.purchaseOrders = purchaseOrders;
                        }
                        res.json(managerData);
                    })
                    .catch(function(posError) {
                        console.log(
                            `db.PO.findAll Error: ${JSON.stringify(posError)}`
                        );
                        managerData.errors.pos = posError;
                    });
            })
            .catch(function(productsError) {
                console.log(
                    `db.Product.findAll Error: ${JSON.stringify(productsError)}`
                );
                managerData.errors.products = productsError;
            });
    });
};
