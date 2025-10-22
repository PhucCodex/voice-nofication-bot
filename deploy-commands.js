const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// --- CẤU HÌNH ---
// Điền 2 thông tin bạn đã lấy ở Phần 1
const TOKEN = 'TOKEN HERE';
const CLIENT_ID = '1426861872975577218';
// --- KẾT THÚC CẤU HÌNH ---

const commands = [
    // 1. Lệnh BẬT/TẮT
    new SlashCommandBuilder()
        .setName('setvoicenotification')
        .setDescription('Bật hoặc Tắt thông báo join/leave voice cho toàn bộ server.')
        .addBooleanOption(option =>
            option.setName('status')
                .setDescription('Chọn True (Bật) hoặc False (Tắt)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // 2. Lệnh Sét tin nhắn JOIN
    new SlashCommandBuilder()
        .setName('setjoinmessage')
        .setDescription('Set đặt tin nhắn khi có người vào (Dùng {user} cho tên người dùng)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Ví dụ: Chào mừng {user} đã hạ cánh!')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // 3. Lệnh Sét tin nhắn LEAVE
    new SlashCommandBuilder()
        .setName('setleavemessage')
        .setDescription('Set đặt tin nhắn khi có người rời (Dùng {user} cho tên người dùng)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Ví dụ: {user} đã bay màu!')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
]
    .map(command => command.toJSON());

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