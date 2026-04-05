  const API_BASE = 'http://127.0.0.1:8000/api';

  // Objeto de configuración de colores para los estados
  const STYLES_STATUS = {
    'pending': { text: 'Pendiente', classes: 'bg-yellow-900/60 text-yellow-300 border border-yellow-800/50' },
    'in_progress': { text: 'En progreso', classes: 'bg-blue-900/60 text-blue-300 border border-blue-800/50' },
    'delivered': { text: 'Entregado', classes: 'bg-purple-900/60 text-purple-300 border border-purple-800/50' },
    'completed': { text: 'Completado', classes: 'bg-green-900/60 text-green-300 border border-green-800/50' },
    'cancelled': { text: 'Cancelado', classes: 'bg-red-900/60 text-red-300 border border-red-800/50' }
  };

  async function loadDashboardData() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      // 1. CARGAR PERFIL (Para el nombre de bienvenida)
      fetch(`${API_BASE}/profile`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(profile => {
        if (profile && profile.names) {
          document.getElementById('welcome-name').innerText = profile.names;
        }
      })
      .catch(err => console.error('Error cargando perfil:', err));

      // 2. CARGAR ÓRDENES (Para las tarjetas estadísticas y la tabla)
      const resOrders = await fetch(`${API_BASE}/orders`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      
      if (!resOrders.ok) throw new Error("No se pudieron cargar las órdenes");
      
      const data = await resOrders.json();
      const orders = data.data || []; // Laravel paginates standard responses

      // --- CALCULADORA DE ESTADÍSTICAS ---
      let totalEarnings = 0;
      let activeCount = 0;
      let pendingCount = 0;

      orders.forEach(o => {
        // Ingresos de trabajos terminados o entregados
        if (o.status === 'completed' || o.status === 'delivered') {
          totalEarnings += parseFloat(o.amount);
        }
        // Pedidos activos (que estás trabajando)
        if (o.status === 'in_progress' || o.status === 'delivered') {
          activeCount++;
        }
        // Solicitudes nuevas esperando que las aceptes (pending)
        if (o.status === 'pending') {
          pendingCount++;
        }
      });

      // Pintar estadísticas en las tarjetas
      document.getElementById('stats-earnings').innerText = `$${totalEarnings.toLocaleString('es-CO')}`;
      document.getElementById('stats-active').innerText = activeCount;
      document.getElementById('stats-pending').innerText = pendingCount;

      // --- PINTAR TABLA DE ÓRDENES RECIENTES ---
      const tbody = document.getElementById('table-recent-orders');
      tbody.innerHTML = ''; // Limpiamos "Cargando..."

      // Mostramos solo los últimos 5 pedidos para no hacer la tabla gigante
      const recentOrders = orders.slice(0, 5);

      if (recentOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">Aún no tienes pedidos. ¡Comparte tus servicios para empezar!</td></tr>`;
        return;
      }

      recentOrders.forEach(order => {
        const clienteName = order.user ? `${order.user.names} ${order.user.last_names}` : 'Cliente Desconocido';
        const serviceName = order.service ? order.service.title : 'Servicio eliminado';
        const orderDate = new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        const formatPrice = `$${Number(order.amount).toLocaleString('es-CO')}`;
        
        // Estilos del estado
        const configState = STYLES_STATUS[order.status] || { text: order.status, classes: 'bg-slate-700 text-slate-300' };

        tbody.innerHTML += `
          <tr class="hover:bg-slate-800/60 transition group">
            <td class="px-6 py-5">
              <span class="font-medium text-slate-200">${clienteName}</span>
            </td>
            <td class="px-6 py-5">
              <span class="text-slate-300 line-clamp-1 max-w-[200px]" title="${serviceName}">${serviceName}</span>
            </td>
            <td class="px-6 py-5">
              <span class="font-semibold text-purple-400">${formatPrice}</span>
            </td>
            <td class="px-6 py-5">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${configState.classes}">
                ${configState.text}
              </span>
            </td>
            <td class="px-6 py-5 text-slate-400 text-sm">
              ${orderDate}
            </td>
            <td class="px-6 py-5 text-right">
              <a href="/dashboard/freelance/seguimiento" class="px-4 py-2 bg-slate-800 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg transition text-sm font-medium">
                Ver detalle
              </a>
            </td>
          </tr>
        `;
      });

    } catch (error) {
      console.error("Error en el Dashboard:", error);
      document.getElementById('table-recent-orders').innerHTML = `
        <tr><td colspan="6" class="px-6 py-8 text-center text-red-400">Error de conexión con el servidor.</td></tr>
      `;
    }
  }

  // Ejecutamos apenas carga la vista
  document.addEventListener('DOMContentLoaded', loadDashboardData);
