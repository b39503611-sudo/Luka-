const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_bot');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    // Vincular por código de 8 dígitos usando el número especificado
    if (!sock.authState.creds.registered) {
        const phoneNumber = "527298112754";
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n========================================`);
                console.log(`CÓDIGO DE EMPAREJAMIENTO DE LUKA: ${code}`);
                console.log(`========================================\n`);
            } catch (e) {
                console.error("Error al generar el código de emparejamiento:", e);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('¡Luka se ha conectado con éxito! 🚀');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const messageType = Object.keys(m.message)[0];
        let body = '';

        if (messageType === 'conversation') {
            body = m.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            body = m.message.extendedTextMessage.text;
        } else if (messageType === 'imageMessage' && m.message.imageMessage.caption) {
            body = m.message.imageMessage.caption;
        }

        const remoteJid = m.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');

        const prefixes = [':#', '##', '%$', '//', '||'];
        let usedPrefix = '';

        for (const p of prefixes) {
            if (body.startsWith(p)) {
                usedPrefix = p;
                break;
            }
        }

        if (!usedPrefix) return;

        const args = body.slice(usedPrefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        const isMainBot = sock.user && sock.user.id.includes('527298112754');
        const modoBot = isMainBot ? 'Bot Principal' : 'Sub-Bot';

        if (command === 'menu' || command === 'p') {
            await sock.sendMessage(remoteJid, { 
                text: `Tipo: publico\n` +
                      `Owner: moshli\n` +
                      `Version: prueba\n` +
                      `Kannal: https://whatsapp.com/channel/0029Vb8jAoNC6ZvjiyLV8S01\n` +
                      `Modo: ${modoBot}\n\n` +
                      `╭── 🤖 **MENÚ DE LUKA** 🤖\n` +
                      `│ Prefijos: :# , ## , %$ , // , ||\n` +
                      `├── 🛡️ *ADMINISTRACIÓN*\n` +
                      `│ • ${usedPrefix}ban\n` +
                      `│ • ${usedPrefix}kick\n` +
                      `│ • ${usedPrefix}abrir / ${usedPrefix}open\n` +
                      `│ • ${usedPrefix}cerrar / ${usedPrefix}cloce\n` +
                      `│ • ${usedPrefix}asender / ${usedPrefix}desender\n` +
                      `├── 👥 *GRUPO*\n` +
                      `│ • ${usedPrefix}tag\n` +
                      `│ • ${usedPrefix}tagall\n` +
                      `│ • ${usedPrefix}resetelink\n` +
                      `├── 🎮 *JUEGOS & GACHA*\n` +
                      `│ • ${usedPrefix}kiss <@user>\n` +
                      `│ • ${usedPrefix}top\n` +
                      `├── ⚙️ *ANTIS & FILTROS*\n` +
                      `│ • ${usedPrefix}antilink | ${usedPrefix}antispam\n` +
                      `│ • ${usedPrefix}antiporno | ${usedPrefix}antistickers\n` +
                      `│ • ${usedPrefix}antiperuanos | ${usedPrefix}antiespañoles\n` +
                      `│ • ${usedPrefix}antimexicanos | ${usedPrefix}antiafricanos\n` +
                      `│ • ${usedPrefix}antivenezolanos | ${usedPrefix}antialemanes\n` +
                      `│ • ${usedPrefix}antifranceses | ${usedPrefix}antingleses\n` +
                      `│ • ${usedPrefix}antiestadeunidenses\n` +
                      `╰──────────────────────\n\n` +
                      `📢 Canal Oficial:\nhttps://whatsapp.com/channel/0029Vb8jAoNC6ZvjiyLV8S01` 
            }, { quoted: m });
        }
    });
}

startBot();
