-- start_stream.lua
-- Запускается в dialplan через: lua(start_stream.lua)

local ws_url = "ws://127.0.0.1:9000/stream"

session:answer()
session:setVariable("audio_stream", ws_url)

-- Подписываемся на события стриминга
session:execute("audio_stream", "connect")
session:execute("audio_stream", "start")

-- Ждём, пока вызов активен
while session:ready() do
    session:execute("sleep", "100")
end

-- Завершаем стриминг
session:execute("audio_stream", "stop")
session:execute("audio_stream", "disconnect")
