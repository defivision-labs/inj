import cors from 'cors';
import axios from 'axios';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';

const app = express(); 
const server = createServer(app); 
const io = new Server(server);

// app.use(cors({ origin: "*" }));


const logger = (message) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`); 
let clients = new Set();
let currentBlock = null;

new Promise(async () => {
    const endpoint = "https://injective-rpc.cosmos-apis.com";
    const maxBlocksDistance = 5;

	while (true) {
		await new Promise(resolveTimeout => setTimeout(resolveTimeout, 1000));
		const latestBlock = await axios.get(endpoint + "/block").then((res) => res.data).catch(_ => null);
		const latestBlockNumber = Number(latestBlock?.result?.block?.header?.height);

        if (isNaN(latestBlockNumber)) continue;
		if (!currentBlock) {
			currentBlock = latestBlockNumber;
        }

        if (currentBlock >= latestBlockNumber) continue;

        clients.forEach(async (client) => client.send('blockLatest', JSON.stringify(latestBlock)));
        logger(`Syncing ${latestBlockNumber - currentBlock} block(s)`);

        if (latestBlockNumber - currentBlock > maxBlocksDistance) {
            logger(`Syncing droped! Syncing distance too long`);
            currentBlock = latestBlockNumber;
            continue;
        }

        for (let blockNumber = currentBlock + 1; blockNumber <= latestBlockNumber;){
            logger(`Syncing: ${blockNumber}`)
            const blockData = blockNumber !== latestBlockNumber
                ? await axios.get(endpoint + `/block?height=${blockNumber}`)
                    .then((res) => res.data.result)
                    .catch(_ => null)
                : latestBlock.result;
            
            if (!blockData) {
                logger(`Syncing blockData for height=${blockNumber} failed`);
                break;
            };

            clients.forEach(async (client) => client.send('blockData', JSON.stringify(blockData)));

			const blockResults = await axios.post(endpoint, {
				jsonrpc: "2.0",
				method: "block_results",
				params: { height: `${blockNumber}` },
				id: 1
			  })
                .then((response) => response.data.result)
                .catch(_ => null)

            if (!blockResults || !blockResults.txs_results) {
                logger(`Syncing blockResults for height=${blockNumber} failed`);
                break;
            };

            clients.forEach(async (client) => client.send('blockResult', JSON.stringify(blockResults)));

			currentBlock = blockNumber;
			blockNumber++;
		}
	}
});

app.get('/', (_, res) => {
    res.send(`dev protocol for inj, latestHeigth: ${currentBlock}`);
});

io.on('connection', (socket) => {
    clients.add(socket);
    logger('a user connected');
    socket.on('disconnect', () => {
        clients.delete(socket);
        logger('user disconnected');
    });
});

const PORT = 8001;
server.listen(PORT, () => {
    logger('listening on *:' + PORT);
});