<template>
  <div class="chart-container">
    <canvas ref="chartCanvas" :width="width" :height="height"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

// Registrar todos los componentes de Chart.js
Chart.register(...registerables)

const props = defineProps({
  chartData: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  width: {
    type: Number,
    default: 400
  },
  height: {
    type: Number,
    default: 200
  }
})

const chartCanvas = ref(null)
let chartInstance = null

const createChart = async () => {
  if (!chartCanvas.value || props.loading || !props.chartData.length) return

  // Destruir gráfico existente
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  await nextTick()

  const ctx = chartCanvas.value.getContext('2d')
  
  // Preparar datos
  const labels = props.chartData.map(item => item.month)
  const amounts = props.chartData.map(item => item.amount)
  const counts = props.chartData.map(item => item.count)

  // Encontrar valores máximos para escalas
  const maxAmount = Math.max(...amounts)
  const maxCount = Math.max(...counts)
  
  // Calcular límites mínimos sensatos para evitar gráficos planos
  const minAmountScale = maxAmount === 0 ? 1000 : Math.max(maxAmount * 1.2, 1000)
  const minCountScale = maxCount === 0 ? 5 : Math.max(maxCount * 1.3, 5)

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Monto Total Pagado',
          data: amounts,
          borderColor: '#0f172a',
          backgroundColor: 'rgba(15, 23, 42, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0f172a',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'y'
        },
        {
          label: 'Cantidad de Facturas',
          data: counts,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: '500'
            },
            color: '#64748b'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: function(context) {
              return `📊 ${context[0].label}`
            },
            label: function(context) {
              if (context.datasetIndex === 0) {
                const value = context.parsed.y
                if (value >= 1000000) {
                  return `💰 Monto: Q${(value / 1000000).toFixed(2)}M`
                } else if (value >= 1000) {
                  return `💰 Monto: Q${(value / 1000).toFixed(1)}K`
                } else {
                  return `💰 Monto: Q${value.toLocaleString('es-GT')}`
                }
              } else {
                const facturas = context.parsed.y === 1 ? 'factura' : 'facturas'
                return `📄 Cantidad: ${context.parsed.y} ${facturas}`
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              weight: '500'
            },
            color: '#64748b',
            padding: 8
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          max: minAmountScale,
          grid: {
            color: 'rgba(226, 232, 240, 0.5)',
            drawBorder: false
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              weight: '500'
            },
            color: '#64748b',
            padding: 8,
            callback: function(value) {
              if (value >= 1000000) {
                return `Q${(value / 1000000).toFixed(1)}M`
              } else if (value >= 1000) {
                return `Q${(value / 1000).toFixed(0)}K`
              } else {
                return `Q${value.toFixed(0)}`
              }
            }
          },
          title: {
            display: true,
            text: 'Monto Total (Q)',
            color: '#0f172a',
            font: {
              size: 12,
              weight: '600'
            }
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          max: minCountScale,
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              weight: '500'
            },
            color: '#10b981',
            padding: 8,
            stepSize: 1,
            callback: function(value) {
              return Math.round(value)
            }
          },
          title: {
            display: true,
            text: 'Cantidad de Facturas',
            color: '#10b981',
            font: {
              size: 12,
              weight: '600'
            }
          }
        }
      },
      elements: {
        point: {
          hoverBorderWidth: 3
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    }
  })
}

// Crear gráfico cuando los datos cambien
watch(() => [props.chartData, props.loading], () => {
  if (!props.loading && props.chartData.length > 0) {
    createChart()
  }
}, { deep: true, immediate: true })

// Función reactiva para actualizar datos del gráfico sin recrearlo
const updateChartData = () => {
  if (!chartInstance || !props.chartData.length) return

  const labels = props.chartData.map(item => item.month)
  const amounts = props.chartData.map(item => item.amount)
  const counts = props.chartData.map(item => item.count)

  // Actualizar datos
  chartInstance.data.labels = labels
  chartInstance.data.datasets[0].data = amounts
  chartInstance.data.datasets[1].data = counts

  // Actualizar escalas dinámicamente
  const maxAmount = Math.max(...amounts)
  const maxCount = Math.max(...counts)
  
  const minAmountScale = maxAmount === 0 ? 1000 : Math.max(maxAmount * 1.2, 1000)
  const minCountScale = maxCount === 0 ? 5 : Math.max(maxCount * 1.3, 5)

  chartInstance.options.scales.y.max = minAmountScale
  chartInstance.options.scales.y1.max = minCountScale

  // Actualizar el gráfico
  chartInstance.update('active')
}

// Watch específico para actualizar datos sin recrear el gráfico
watch(() => props.chartData, (newData, oldData) => {
  if (chartInstance && newData && newData.length > 0) {
    // Si la estructura básica es la misma, solo actualizar datos
    if (oldData && oldData.length === newData.length) {
      updateChartData()
    } else {
      // Si cambió la estructura, recrear el gráfico
      createChart()
    }
  }
}, { deep: true })

onMounted(() => {
  if (!props.loading && props.chartData.length > 0) {
    createChart()
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
}

canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>