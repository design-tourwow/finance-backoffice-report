const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.url}`);
    
    // Remove query string from URL
    const urlWithoutQuery = req.url.split('?')[0];
    let filePath = '.' + urlWithoutQuery;
    
    // Route / to index.html
    if (urlWithoutQuery === '/') {
        filePath = './index.html';
    }
    else if (urlWithoutQuery === '/dashboard') {
        filePath = './dashboard.html';
    }
    else if (urlWithoutQuery === '/401') {
        filePath = './401.html';
    }
    else if (urlWithoutQuery === '/403') {
        filePath = './403.html';
    }
    else if (urlWithoutQuery === '/404') {
        filePath = './404.html';
    }
    // Route /tour-image-manager to tour-image-manager.html
    else if (urlWithoutQuery === '/tour-image-manager') {
        filePath = './tour-image-manager.html';
    }
    else if (urlWithoutQuery === '/sales-by-country') {
        filePath = './sales-by-country.html';
    }
    else if (urlWithoutQuery === '/wholesale-destinations') {
        filePath = './wholesale-destinations.html';
    }
    else if (urlWithoutQuery === '/sales-report') {
        filePath = './sales-report.html';
    }
    else if (urlWithoutQuery === '/sales-report-by-seller') {
        filePath = './sales-report-by-seller.html';
    }
    else if (urlWithoutQuery === '/work-list') {
        filePath = './work-list.html';
    }
    else if (urlWithoutQuery === '/supplier-commission') {
        filePath = './supplier-commission.html';
    }
    else if (urlWithoutQuery === '/discount-sales') {
        filePath = './discount-sales.html';
    }
    else if (urlWithoutQuery === '/order-external-summary') {
        filePath = './order-external-summary.html';
    }
    else if (urlWithoutQuery === '/request-discount') {
        filePath = './request-discount.html';
    }
    else if (urlWithoutQuery === '/order-report') {
        filePath = './order-report.html';
    }
    else if (urlWithoutQuery === '/repeated-customer-report') {
        filePath = './repeated-customer-report.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile('./404.html', (notFoundError, notFoundContent) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    if (notFoundError) {
                        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
                        return;
                    }
                    res.end(notFoundContent, 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}\n`);
    console.log(`📄 Available routes:`);
    console.log(`   - http://localhost:${PORT}/`);
    console.log(`   - http://localhost:${PORT}/401`);
    console.log(`   - http://localhost:${PORT}/403`);
    console.log(`   - http://localhost:${PORT}/404`);
    console.log(`   - http://localhost:${PORT}/tour-image-manager\n`);
});
