const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database(':memory:'); 

// Middleware to authenticate wether bearer token is danang when decoded
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token === undefined) return res.status(401).json({ error: 'Unauthorized: Bearer token not provided' });

    const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    // Check if the decoded token matches 'danang satriani'
    if (decodedToken === 'danang satriani') {
        next(); 
    } else {
        res.json({status:401,message:'this is not danang,wrong token'}); 
    }
};

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/me',authenticateToken, (req, res) => {
    const { name } = req.body;
    if(name){
        db.serialize(() => {
            db.run('CREATE TABLE IF NOT EXISTS account_detail (id INTEGER PRIMARY KEY, balance REAL, name TEXT)');
            const stmt = db.prepare('SELECT * FROM account_detail WHERE name = ?');
            stmt.get(name, (err, row) => {
                if (err) {
                    console.error(err.message);
                    return;
                }
                if (!row) {
                    const insertStmt = db.prepare('INSERT INTO account_detail (balance, name) VALUES (?, ?)');
                    insertStmt.run(0, name, function(err) {
                        if (err) {
                            console.error(err.message);
                            return;
                        }
                          stmt.get(name, (err, insertedRow) => {
                            if (err) {
                                console.error(err.message);
                                return;
                            }
                            res.json({
                                data:insertedRow,
                                message:'ok',
                                status:200
                            })
                        });
                    });
                    insertStmt.finalize();
                } else {
                    res.json({
                        data:row,
                        status:200,
                        message:'ok'
                    })
                }
                
            });
        });
    }else{
        res.json({
            data:null,
            status:422,
            message:'invalid input lol'
        })
    }
});
app.post('/deposit',authenticateToken, (req, res) => {
    const { order_id, amount, timestamp, name } = req.body;
    if(order_id,amount,timestamp,name){
        
        db.serialize(() => {
            db.run('CREATE TABLE IF NOT EXISTS deposits (order_id INTEGER, amount REAL, timestamp TEXT)');
            const stmt = db.prepare('INSERT INTO deposits (order_id, amount, timestamp) VALUES (?, ?, ?)');

            stmt.run(order_id, amount, timestamp,function(err){
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                 // After inserting into deposits, update the balance in account_detail based on the retrieved name
                 const updateBalance = db.prepare('UPDATE account_detail SET balance = balance + ? WHERE name = ?')
                 updateBalance.run(amount, name, function(err) {
                    if (err) {
                        console.error(err.message);
                        res.status(500).json({ error: err.message });
                        return;
                    }
                });

            });
            stmt.finalize();

            res.json({
                data: 'success',
                status:200,
                message: 'Deposit successful and balance has updated'
            });
        });

    }else{
        res.json({
            data:null,
            status:422,
            message:'invalid input lol'
        })
    }
});

app.get('/history',authenticateToken, (req, res) => {
        
        db.serialize(() => {
            const stmt = db.prepare('SELECT * FROM deposits');
            stmt.all(function(err,rows){
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({
                    status:200,
                    data: rows,
                    message: 'Deposit history retrieved successfully'
                });
            });
            stmt.finalize();

        });

   
});


// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
