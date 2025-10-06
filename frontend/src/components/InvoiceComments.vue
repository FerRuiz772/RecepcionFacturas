<template>
  <v-card flat class="invoice-comments-card">
    <v-card-title class="d-flex align-center px-4 py-3">
      <v-icon class="mr-2" color="primary">mdi-chat-outline</v-icon>
      <span>Comentarios</span>
      <v-spacer></v-spacer>
      <v-chip size="small" color="primary" variant="outlined">
        {{ comments.length }}
      </v-chip>
    </v-card-title>

    <v-divider></v-divider>

    <!-- Lista de comentarios -->
    <v-card-text class="comments-container pa-0">
      <div v-if="loading" class="text-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>

      <div v-else-if="comments.length === 0" class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-chat-off-outline</v-icon>
        <p class="text-grey mt-2">No hay comentarios aún</p>
        <p class="text-caption text-grey">Sé el primero en comentar</p>
      </div>

      <div v-else class="comments-list pa-4">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="comment-item mb-4"
          :class="{ 'own-comment': comment.user_id === currentUser?.id }"
        >
          <div class="comment-header d-flex align-center mb-1">
            <v-avatar size="32" :color="getAvatarColor(comment.user.role)" class="mr-2">
              <span class="text-white text-caption">
                {{ getInitials(comment.user.name) }}
              </span>
            </v-avatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center">
                <span class="font-weight-medium text-body-2">{{ comment.user.name }}</span>
                <v-chip
                  size="x-small"
                  :color="getRoleColor(comment.user.role)"
                  class="ml-2"
                  variant="outlined"
                >
                  {{ getRoleLabel(comment.user.role) }}
                </v-chip>
              </div>
              <span class="text-caption text-grey">
                {{ formatDate(comment.created_at) }}
              </span>
            </div>
          </div>
          <div class="comment-body ml-10">
            <p class="text-body-2 mb-0">{{ comment.comment }}</p>
          </div>
        </div>
      </div>
    </v-card-text>

    <v-divider></v-divider>

    <!-- Formulario para nuevo comentario -->
    <v-card-actions class="pa-4">
      <v-textarea
        v-model="newComment"
        :disabled="sending"
        label="Escribe un comentario..."
        variant="outlined"
        rows="3"
        hide-details
        class="flex-grow-1"
        @keydown.ctrl.enter="sendComment"
      ></v-textarea>
      <v-btn
        icon
        color="primary"
        :disabled="!newComment.trim() || sending"
        :loading="sending"
        @click="sendComment"
        class="ml-2"
      >
        <v-icon>mdi-send</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  invoiceId: {
    type: Number,
    required: true
  }
});

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user);

const comments = ref([]);
const newComment = ref('');
const loading = ref(false);
const sending = ref(false);
let pollInterval = null;

// Obtener comentarios
const fetchComments = async () => {
  try {
    const response = await axios.get(`/api/invoices/${props.invoiceId}/comments`);
    comments.value = response.data.data || [];
  } catch (error) {
    console.error('Error al cargar comentarios:', error);
  }
};

// Enviar comentario
const sendComment = async () => {
  if (!newComment.value.trim()) return;

  sending.value = true;
  try {
    await axios.post(`/api/invoices/${props.invoiceId}/comments`, {
      comment: newComment.value.trim()
    });
    newComment.value = '';
    await fetchComments(); // Recargar comentarios
  } catch (error) {
    console.error('Error al enviar comentario:', error);
    alert('Error al enviar comentario');
  } finally {
    sending.value = false;
  }
};

// Formatear fecha
const formatDate = (date) => {
  const d = new Date(date);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year} a las ${hours}:${minutes}`;
};

// Obtener iniciales del nombre
const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Color del avatar según rol
const getAvatarColor = (role) => {
  const colors = {
    'proveedor': 'blue',
    'admin_contaduria': 'purple',
    'trabajador_contaduria': 'teal',
    'super_admin': 'red'
  };
  return colors[role] || 'grey';
};

// Color del chip de rol
const getRoleColor = (role) => {
  const colors = {
    'proveedor': 'blue',
    'admin_contaduria': 'purple',
    'trabajador_contaduria': 'teal',
    'super_admin': 'red'
  };
  return colors[role] || 'grey';
};

// Etiqueta del rol
const getRoleLabel = (role) => {
  const labels = {
    'proveedor': 'Proveedor',
    'admin_contaduria': 'Admin',
    'trabajador_contaduria': 'Contaduría',
    'super_admin': 'Super Admin'
  };
  return labels[role] || role;
};

// Lifecycle
onMounted(async () => {
  loading.value = true;
  await fetchComments();
  loading.value = false;

  // Polling cada 10 segundos
  pollInterval = setInterval(fetchComments, 10000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>

<style scoped>
.invoice-comments-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.comments-container {
  flex: 1;
  overflow-y: auto;
  max-height: 500px;
}

.comments-list {
  display: flex;
  flex-direction: column;
}

.comment-item {
  border-left: 3px solid transparent;
  padding-left: 8px;
  transition: all 0.2s;
}

.comment-item:hover {
  border-left-color: var(--v-primary-base);
  background-color: rgba(0, 0, 0, 0.02);
}

.comment-item.own-comment {
  border-left-color: var(--v-primary-base);
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.comment-header {
  margin-bottom: 4px;
}

.comment-body {
  word-wrap: break-word;
}
</style>
