const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// --- CẤU HÌNH ---
const TOKEN = 'TOKEN_CUA_BAN_VAO_DAY'; // Chỉ cần token để chạy file này
const CLIENT_ID = 'CLIENT_ID_CUA_BOT_VAO_DAY';
// --- KẾT THÚC CẤU HÌNH ---

const commands = [
    // --- 3 LỆNH CŨ (Giữ nguyên) ---
    new SlashCommandBuilder()
        .setName('setvoicenotification')
        .setDescription('Bật hoặc Tắt thông báo join/leave voice cho toàn bộ server.')
        // ... (phần còn lại của lệnh này giữ nguyên)
        .addBooleanOption(option =>
            option.setName('status')
                .setDescription('Chọn True (Bật) hoặc False (Tắt)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
        .setName('setjoinmessage')
        .setDescription('Sét đặt tin nhắn khi có người vào (Dùng {user} cho tên người dùng)')
        // ... (phần còn lại của lệnh này giữ nguyên)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Ví dụ: Chào mừng {user} đã hạ cánh!')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
        .setName('setleavemessage')
        .setDescription('Sét đặt tin nhắn khi có người rời (Dùng {user} cho tên người dùng)')
        // ... (phần còn lại của lệnh này giữ nguyên)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Ví dụ: {user} đã bay màu!')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    // --- 2 LỆNH MỚI (Dành cho chủ bot) ---
    new SlashCommandBuilder()
        .setName('setstatus')
        .setDescription('Sét đặt trạng thái (Playing) của bot (Chỉ chủ bot).')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Màu sắc/trạng thái (online, idle, dnd)')
                .setRequired(true)
                .addChoices(
                    { name: 'Online (Xanh lá)', value: 'online' },
                    { name: 'Idle (Vắng - Vàng)', value: 'idle' },
                    { name: 'DND (Đỏ)', value: 'dnd' }
                ))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Nội dung "Đang chơi..."')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('setstreaming')
        .setDescription('Sét trạng thái streaming (màu tím) của bot (Chỉ chủ bot).')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Nội dung đang stream')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Link Twitch hoặc YouTube (phải hợp lệ, vd: https://www.twitch.tv/...)')
                .setRequired(true))
]
    .map(command => command.toJSON());

// ... (phần "const rest = ..." và "(async () => ..." giữ nguyên)
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        console.log('Bắt đầu đăng ký (/) commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Đã đăng ký thành công (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
