const StatsCard = ({ title, value, icon: Icon, color = 'primary', subtitle }) => {
  const colorMap = {
    primary: 'from-primary-500 to-primary-700 shadow-primary-500/25',
    success: 'from-success-500 to-success-600 shadow-success-500/25',
    warning: 'from-warning-500 to-warning-600 shadow-warning-500/25',
    danger:  'from-danger-500 to-danger-600 shadow-danger-500/25',
    accent:  'from-accent-500 to-accent-600 shadow-accent-500/25',
  };

  return (
    <div className="glass-card p-6 fade-in group hover:scale-[1.02] transition-transform duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-700/60">{title}</p>
          <p className="text-3xl font-bold mt-2 text-surface-900">{value}</p>
          {subtitle && <p className="text-xs text-surface-700/50 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
