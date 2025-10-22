// THÊM "ActivityType" vào dòng này
const { Client, GatewayIntentBits, ActivityType } = require('discord.js'); 
const { QuickDB } = require('quick.db');
const path = require('path'); // Thư viện 'path' của Node.js
const fs = require('fs');

// --- CẤU HÌNH ---
const TOKEN = process.env.TOKEN;
// ⚠️ THÊM DÒNG NÀY: Điền ID Discord của bạn vào đây
const OWNER_ID = '844940927268683796'; 
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

// SỬA HÀM NÀY: Thêm code sét trạng thái mặc định
client.once('ready', () => {
    console.log(`Đã đăng nhập với tư cách ${client.user.tag}!`);
    console.log('Bot sẵn sàng thông báo (Logic: >= 2 người).');

    // --- SÉT TRẠNG THÁI MẶC ĐỊNH (Giống OwO) ---
    client.user.setPresence({
        activities: [{ name: 'HVTM', type: ActivityType.Playing }],
        status: 'online', // 'online' là màu xanh lá
    });
    console.log('[Status] Đã set trạng thái mặc định: Playing HVTM (Online).');
    // ----------------------------------------
});

/**
 * Hàm trợ giúp: Gửi tin nhắn một cách an toàn.
 * (Giữ nguyên không đổi)
 */
async function sendSafeMessage(channel, messageContent) {
    if (!channel) return;
    try {
        await channel.send(messageContent);
    } catch (error) {
        console.warn(`[CẢNH BÁO] Không thể gửi tin nhắn tới kênh ${channel.name} (ID: ${channel.id}). Lý do: ${error.message}`);
    }
}

// SỬA HÀM NÀY: Thêm 2 lệnh mới vào ĐẦU
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

    const { commandName, guild } = interaction;
    const dbKeyPrefix = `guild_${guild.id}`;

    // === CODE MỚI: XỬ LÝ LỆNH STATUS (Chỉ chủ bot) ===
    if (commandName === 'setstatus' || commandName === 'setstreaming') {
        // Kiểm tra xem người dùng có phải là chủ bot không
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: 'Lỗi: Chỉ chủ bot mới được dùng lệnh này.', ephemeral: true });
        }

        // Lệnh: /setstatus (online, idle, dnd)
        if (commandName === 'setstatus') {
            const status = interaction.options.getString('status');
            const message = interaction.options.getString('message');

            client.user.setPresence({
                activities: [{ name: message, type: ActivityType.Playing }],
                status: status, // 'online', 'idle', 'dnd'
            });

            await interaction.reply({ content: `✅ Đã cập nhật trạng thái: \`${status}\` | \`Playing ${message}\``, ephemeral: true });
            return; // Dừng lại sau khi xử lý xong
        }

        // Lệnh: /setstreaming (màu tím)
        if (commandName === 'setstreaming') {
            const message = interaction.options.getString('message');
            const url = interaction.options.getString('url');

            // Kiểm tra link (bắt buộc)
            if (!url.startsWith('https://www.twitch.tv/') && !url.startsWith('https://www.youtube.com/')) {
                return interaction.reply({ content: 'Lỗi: Link URL phải bắt đầu bằng `https://www.twitch.tv/` hoặc `https://www.youtube.com/`.', ephemeral: true });
            }

            client.user.setPresence({
                activities: [{
                    name: message,
                    type: ActivityType.Streaming,
                    url: url, // Phải có URL hợp lệ thì trạng thái tím mới hiện
                }],
                status: 'online', 
            });

            await interaction.reply({ content: `✅ Đã cập nhật trạng thái: \`Streaming ${message}\` (Màu tím).`, ephemeral: true });
            return; // Dừng lại sau khi xử lý xong
        }
    }
    // === KẾT THÚC CODE MỚI ===


    // === CODE CŨ (Giữ nguyên) ===

    // Lệnh: /setvoicenotification
    if (commandName === 'setvoicenotification') {
        const status = interaction.options.getBoolean('status');
        await db.set(`${dbKeyPrefix}.status`, status);
        const statusText = status ? "BẬT" : "TẮT";
        await interaction.reply({
            content: `✅ Thành công! Thông báo Join/Leave đã được **${statusText}**.`,
            ephemeral: true
        });
    }

    // Lệnh: /setjoinmessage
    if (commandName === 'setjoinmessage') {
        const message = interaction.options.getString('message');
        await db.set(`${dbKeyPrefix}.joinMsg`, message);
        await interaction.reply({
            content: `✅ Thành công! Đã lưu tin nhắn Join: \`${message.includes('{user}') ? message : message + " (Cảnh báo: thiếu {user})"}\``,
            ephemeral: true
        });
    }

    // Lệnh: /setleavemessage
    if (commandName === 'setleavemessage') {
        const message = interaction.options.getString('message');
        await db.set(`${dbKeyPrefix}.leaveMsg`, message);
        await interaction.reply({
            content: `✅ Thành công! Đã lưu tin nhắn Leave: \`${message.includes('{user}') ? message : message + " (Cảnh báo: thiếu {user})"}\``,
            ephemeral: true
        });
    }
});

// Xử lý Logic Voice (Giữ nguyên không đổi)
client.on('voiceStateUpdate', async (oldState, newState) => {
    // ... (Toàn bộ code xử lý voice giữ nguyên)
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
        if (oldChannel.members.size >= 2) {
            const finalMessage = leaveMsgTemplate.replace('{user}', displayName);
            await sendSafeMessage(oldChannel, finalMessage);
        }
    }

    // KỊCH BẢN 2: VÀO PHÒNG (Join)
    if (!oldChannel && newChannel) {
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

// Đăng nhập bot (Giữ nguyên không đổi)
if (!TOKEN) {
    console.error("LỖI NGHIÊM TRỌNG: Không tìm thấy TOKEN. Hãy kiểm tra biến môi trường (Variables) trên Railway.");
} else {
    client.login(TOKEN);
}
