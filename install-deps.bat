@echo off
REM Script de instalação de dependências para Windows

echo 📦 Instalando dependências do backend...
cd src\backend
call npm install
cd ..\..

echo 📦 Instalando dependências do frontend...
cd src\frontend
call npm install
cd ..\..

echo ✅ Todas as dependências foram instaladas!
echo.
echo 🚀 Próximos passos:
echo   1. Configure .env.local com credenciais do Supabase
echo   2. Execute SQL schema no Supabase
echo   3. Rode npm run seed no src/backend para popular dados
echo   4. Inicie: npm run dev em cada projeto (em terminais separados)
