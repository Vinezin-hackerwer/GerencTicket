const { db } = require('../config/db');

function getReports(req, res) {
  const { startDate, endDate, status, priority, technicianId } = req.query;

  let whereClauses = ['1=1'];
  const params = [];

  if (startDate) {
    whereClauses.push(`date(t.created_at) >= date(?)`);
    params.push(startDate);
  }

  if (endDate) {
    whereClauses.push(`date(t.created_at) <= date(?)`);
    params.push(endDate);
  }

  const baseWhere = whereClauses.join(' AND ');

  // 1. Totals by status
  const statusStats = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM tickets t
    WHERE ${baseWhere}
    GROUP BY status
  `).all(...params);

  // 2. Totals by priority
  const priorityStats = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM tickets t
    WHERE ${baseWhere}
    GROUP BY priority
  `).all(...params);

  // 3. Totals by technician
  const technicianStats = db.prepare(`
    SELECT 
      COALESCE(tech.name, 'Não atribuído') as technician_name,
      tech.id as technician_id,
      COUNT(*) as total,
      SUM(CASE WHEN t.status = 'Concluído' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN t.status != 'Concluído' THEN 1 ELSE 0 END) as active
    FROM tickets t
    LEFT JOIN users tech ON tech.id = t.technician_id
    WHERE ${baseWhere}
    GROUP BY t.technician_id
  `).all(...params);

  // 4. Average resolution time for concluded tickets
  const avgResult = db.prepare(`
    SELECT 
      COUNT(*) as closed_count,
      AVG((julianday(t.closed_at) - julianday(t.created_at)) * 24.0) as avg_hours
    FROM tickets t
    WHERE ${baseWhere} AND t.status = 'Concluído' AND t.closed_at IS NOT NULL
  `).get(...params);

  const avgHours = avgResult && avgResult.avg_hours !== null ? Number(avgResult.avg_hours.toFixed(1)) : 0;
  let formattedAvg = '0h';
  if (avgHours > 0) {
    const hours = Math.floor(avgHours);
    const minutes = Math.round((avgHours - hours) * 60);
    formattedAvg = `${hours}h ${minutes}min`;
  }

  // 5. Filterable tickets list
  let ticketListWhere = [...whereClauses];
  const ticketListParams = [...params];

  if (status && status !== 'all') {
    ticketListWhere.push(`t.status = ?`);
    ticketListParams.push(status);
  }

  if (priority && priority !== 'all') {
    ticketListWhere.push(`t.priority = ?`);
    ticketListParams.push(priority);
  }

  if (technicianId && technicianId !== 'all') {
    if (technicianId === 'unassigned') {
      ticketListWhere.push(`t.technician_id IS NULL`);
    } else {
      ticketListWhere.push(`t.technician_id = ?`);
      ticketListParams.push(technicianId);
    }
  }

  const tickets = db.prepare(`
    SELECT 
      t.*,
      u.name as creator_name,
      tech.name as technician_name
    FROM tickets t
    JOIN users u ON u.id = t.created_by
    LEFT JOIN users tech ON tech.id = t.technician_id
    WHERE ${ticketListWhere.join(' AND ')}
    ORDER BY t.created_at DESC
  `).all(...ticketListParams);

  // Overall total
  const totalCountResult = db.prepare(`SELECT COUNT(*) as total FROM tickets t WHERE ${baseWhere}`).get(...params);

  return res.json({
    summary: {
      totalTickets: totalCountResult ? totalCountResult.total : 0,
      closedTickets: avgResult ? avgResult.closed_count : 0,
      avgResolutionHours: avgHours,
      avgResolutionFormatted: formattedAvg,
      byStatus: statusStats,
      byPriority: priorityStats,
      byTechnician: technicianStats
    },
    tickets
  });
}

module.exports = {
  getReports
};
