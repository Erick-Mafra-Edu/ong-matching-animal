#!/bin/bash
# Script de instalação de dependências

echo "📦 Instalando dependências do backend..."
cd src/backend && npm install
cd ../..

echo "📦 Instalando dependências do frontend..."
cd src/frontend && npm install
cd ../..

echo "✅ Todas as dependências foram instaladas!"
echo ""
echo "🚀 Próximos passos:"
echo "  1. Configure .env.local com credenciais do Supabase"
echo "  2. Execute SQL schema no Supabase"
echo "  3. Rode npm run seed no src/backend para popular dados"
echo "  4. Inicie: npm run dev em cada projeto (em terminais separados)"
