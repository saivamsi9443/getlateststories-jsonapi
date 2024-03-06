const http = require('http');
const https=require('https')

function getHTML(url, callback) {
    
    const protocol = url.startsWith('https') ? https : http;

    const urlParts = new URL(url);
    
    const options = {
        hostname: urlParts.hostname,
        path: urlParts.pathname + urlParts.search,
        method: 'GET'
    };

    const req = protocol.request(options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            const newUrl = res.headers.location;
            console.log("Redirected to:", newUrl);
            getHTML(newUrl, callback);
            return;
        }

        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            callback(data);
        });
    });

    req.on("error", (err) => {
        console.log("Error: ", err.message);
    });

    req.end();
}

function extractLatestStories(html) {
    let latestStories = [];
    try {
        let startMarker = '<div class="partial latest-stories"';
        let endMarker = '</ul>';
        let startIndex = html.indexOf(startMarker);
        let endIndex = html.indexOf(endMarker, startIndex);
        let storiesHtml = html.substring(startIndex, endIndex);

        let itemPattern = /<li class="latest-stories__item">([\s\S]*?)<\/li>/g;
        let match;
        while ((match = itemPattern.exec(storiesHtml)) !== null) {
            let itemHtml = match[1];
            let titleStart = itemHtml.indexOf('<h3 class="latest-stories__item-headline">');
            if (titleStart === -1) continue;
            titleStart += '<h3 class="latest-stories__item-headline">'.length;
            let titleEnd = itemHtml.indexOf('</h3>', titleStart);
            let title = itemHtml.substring(titleStart, titleEnd);

            let linkStart = itemHtml.indexOf('<a href="') + '<a href="'.length;
            let linkEnd = itemHtml.indexOf('">', linkStart);
            let link = "https://time.com" + itemHtml.substring(linkStart, linkEnd);

            latestStories.push({ "title": title.trim(), "link": link.trim() });
        }
    } catch (error) {
        console.log("Error:", error.message);
    }
    return latestStories.slice(0, 6); // Return only the latest 6 stories
}


const server = http.createServer((req, res) => {
    if (req.url === '/getTimeStories' && req.method === 'GET') {
        const url = 'http://time.com';
        getHTML(url, (html) => {
            const latestStories = extractLatestStories(html); 
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(latestStories, null, 2));
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found......');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
