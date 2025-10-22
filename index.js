const { Client, GatewayIntentBits } = require('discord.js');
const { QuickDB } = require('quick.db');
const path = require('path'); // Thư viện 'path' của Node.js
const fs = require('fs');

// --- CẤU HÌNH ---
const TOKEN = process.env.TOKEN;
// --- KẾT THÚC CẤU HÌNH ---

// === CÀI ĐẶT DATABASE CHO RAILWAY ===

const dataPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || 'data';

// --- SỬA LỖI: TỰ ĐỘNG TẠO THƯ MỤC 'data' NẾU CHƯA CÓ ---
if (!fs.existsSync(dataPath)) {
    console.log(`[DB] Thư mục data tại '${dataPath}' không tồn tại. Đang tạo...`);
    fs.mkdirSync(dataPath, { recursive: true });
}
// --- KẾT THÚC SỬA LỖI ---

const dbPath = path.join(dataPath, 'db.sqlite');

// 3. Bảo quick.db hãy lưu file vào đúng đường dẫn đó
const db = new QuickDB({ filePath: dbPath });

console.log(`[DB] Database sẽ được lưu tại: ${dbPath}`);
// ===================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates, // BẮT BUỘC: Để nhận sự kiện voice
        GatewayIntentBits.GuildMessages,    // BẮT BUỘC: Để gửi tin nhắn
    ]
});

client.once('ready', () => {
    console.log(`Đã đăng nhập với tư cách ${client.user.tag}!`);
    console.log('Bot sẵn sàng thông báo (Logic: >= 2 người).');
});

/**
 * Hàm trợ giúp: Gửi tin nhắn một cách an toàn.
 * Chống crash bot khi phòng voice bị xóa (do bot temp-voice).
 */
async function sendSafeMessage(channel, messageContent) {
    if (!channel) return;
    try {
        await channel.send(messageContent);
    } catch (error) {
        console.warn(`[CẢNH BÁO] Không thể gửi tin nhắn tới kênh ${channel.name} (ID: ${channel.id}). Lý do: ${error.message}`);
    }
}

// Xử lý Lệnh Slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

    const { commandName, guild } = interaction;
    const dbKeyPrefix = `guild_${guild.id}`;

    // Lệnh: /setvoicenotification
    if (commandName === 'setvoicenotification') {
        const status = interaction.options.getBoolean('status');
        await db.set(`${dbKeyPrefix}.status`, status);
        const statusText = status ? "BẬT" : "TẮT";
        await interaction.reply({
            content: `✅ OK! Thông báo Join/Leave đã được **${statusText}**.`,
            ephemeral: true
        });
    }

    // Lệnh: /setjoinmessage
    if (commandName === 'setjoinmessage') {
        const message = interaction.options.getString('message');
        await db.set(`${dbKeyPrefix}.joinMsg`, message);
        await interaction.reply({
            content: `✅ OK! Đã lưu tin nhắn Join: \`${message.includes('{user}') ? message : message + " (Cảnh báo: thiếu {user})"}\``,
            ephemeral: true
        });
    }

    // Lệnh: /setleavemessage
    if (commandName === 'setleavemessage') {
        const message = interaction.options.getString('message');
        await db.set(`${dbKeyPrefix}.leaveMsg`, message);
        await interaction.reply({
            content: `✅ OK! Đã lưu tin nhắn Leave: \`${message.includes('{user}') ? message : message + " (Cảnh báo: thiếu {user})"}\``,
            ephemeral: true
        });
    }
});

// Xử lý Logic Voice
client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (member.user.bot) return; // Bỏ qua bot

    const guild = newState.guild || oldState.guild;
    const dbKeyPrefix = `guild_${guild.id}`;

    // 1. Kiểm tra xem admin có BẬT tính năng này không
    const isEnabled = (await db.get(`${dbKeyPrefix}.status`)) ?? true; // Mặc định là Bật
    if (!isEnabled) return; // Nếu admin tắt, dừng lại

    // 2. Lấy cài đặt tin nhắn
    const joinMsgTemplate = (await db.get(`${dbKeyPrefix}.joinMsg`)) || '👋 **{user}** đã vào phòng!';
    const leaveMsgTemplate = (await db.get(`${dbKeyPrefix}.leaveMsg`)) || '😥 **{user}** đã rời phòng.';

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    const displayName = member.displayName; // Tên hiển thị {user}

    // KỊCH BẢN 1: RỜI PHÒNG (Leave)
    if (oldChannel && !newChannel) {
        // oldChannel.members.size là số người TRƯỚC KHI rời.
        // Nếu >= 2 (ví dụ: 2 người, 1 người rời), thì thông báo.
        // Nếu là 1 (người cuối cùng), thì KHÔNG thông báo (1 < 2).
        if (oldChannel.members.size >= 2) {
            const finalMessage = leaveMsgTemplate.replace('{user}', displayName);
            await sendSafeMessage(oldChannel, finalMessage);
        }
    }

    // KỊCH BẢN 2: VÀO PHÒNG (Join)
    if (!oldChannel && newChannel) {
        // newChannel.members.size là số người SAU KHI vào.
        // Nếu >= 2 (người thứ 2 vào), thì thông báo.
        // Nếu là 1 (người đầu tiên), thì KHÔNG thông báo (1 < 2).
        if (newChannel.members.size >= 2) {
            const finalMessage = joinMsgTemplate.replace('{user}', displayName);
            await sendSafeMessage(newChannel, finalMessage);
        }
    }

    // KỊCH BẢN 3: CHUYỂN PHÒNG (Move)
    if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
        // Coi như LEAVE khỏi phòng cũ
        if (oldChannel.members.size >= 2) {
            const finalMessage = leaveMsgTemplate.replace('{user}', displayName);
            await sendSafeMessage(oldChannel, finalMessage);
        }
        // Coi như JOIN vào phòng mới
        if (newChannel.members.size >= 2) {
            const finalMessage = joinMsgTemplate.replace('{user}', displayName);
            await sendSafeMessage(newChannel, finalMessage);
        }
    }
});

// Đăng nhập bot (Nhớ điền TOKEN)
if (!TOKEN) {
    console.error("LỖI NGHIÊM TRỌNG: Không tìm thấy TOKEN. Hãy kiểm tra biến môi trường (Variables) trên Railway.");
} else {
    client.login(TOKEN);
}
