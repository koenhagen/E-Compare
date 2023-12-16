function createTrendPlot(data) {
    const maxValue = Math.max(...data.map(entry => entry.Value));
    const timeAxis = Array.from({ length: maxValue + 1 }, (_, i) => i);

    // Add vertical axis and plot
    const trendPlot = timeAxis.map(value => {
        const row = data.map(entry => entry.Value >= value ? '████' : '    ');
        return `${value} | ${row.join('')}`;
    }).reverse().join('\n');

    // Add horizontal axis
    const horizontalAxis = '--'.repeat(data.length * 2 + 5);
    const xAxisLabels = data.map(entry => entry.Time.padStart(2)).join('  ');

    return `${horizontalAxis}\n${trendPlot}\n${horizontalAxis}\n  ${xAxisLabels}`;
}

const data = [
    { Time: 'Jan', Value: 10 },
    { Time: 'Feb', Value: 15 },
    { Time: 'Mar', Value: 12 },
    { Time: 'Apr', Value: 18 },
    { Time: 'May', Value: 25 },
];

const trendPlot = createTrendPlot(data);
console.log(trendPlot);