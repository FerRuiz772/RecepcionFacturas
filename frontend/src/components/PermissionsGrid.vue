<template>
  <div class="permissions-grid">
    <h3 class="mb-4">
      <v-icon>mdi-shield-account</v-icon>
      Permisos de Usuario
    </h3>
    
    <!-- Presets rápidos -->
    <div class="mb-4">
      <v-btn-toggle
        v-model="selectedPreset"
        @update:model-value="applyPreset"
        mandatory
        class="mb-3"
      >
        <v-btn value="super_admin" size="small">
          <v-icon left>mdi-crown</v-icon>
          Super Admin
        </v-btn>
        <v-btn value="admin_contaduria" size="small">
          <v-icon left>mdi-account-supervisor</v-icon>
          Admin Contaduría
        </v-btn>
        <v-btn value="trabajador_contaduria" size="small">
          <v-icon left>mdi-account-hard-hat</v-icon>
          Trabajador
        </v-btn>
        <v-btn value="proveedor" size="small">
          <v-icon left>mdi-truck</v-icon>
          Proveedor
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- Grilla de permisos -->
    <div class="permissions-modules">
      <v-row v-for="(moduleInfo, moduleKey) in permissionInfo.modules" :key="moduleKey">
        <v-col cols="12">
          <v-card class="mb-3" outlined>
            <v-card-title class="py-2">
              <span class="module-icon">{{ moduleInfo.icon }}</span>
              {{ moduleInfo.name }}
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col 
                  v-for="(actionLabel, actionKey) in moduleInfo.actions" 
                  :key="actionKey"
                  cols="6" 
                  md="3"
                >
                  <v-checkbox
                    :model-value="hasPermission(moduleKey, actionKey)"
                    @update:model-value="togglePermission(moduleKey, actionKey, $event)"
                    :label="actionLabel"
                    color="success"
                    class="permission-checkbox"
                    :class="{ 
                      'permission-granted': hasPermission(moduleKey, actionKey),
                      'permission-denied': !hasPermission(moduleKey, actionKey)
                    }"
                    hide-details
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Botones de acción -->
    <div class="text-center mt-4">
      <v-btn
        @click="savePermissions"
        color="success"
        size="large"
        :loading="saving"
        class="mr-3"
      >
        <v-icon left>mdi-content-save</v-icon>
        Guardar Permisos
      </v-btn>
      
      <v-btn
        @click="resetPermissions"
        color="warning"
        size="large"
        variant="outlined"
      >
        <v-icon left>mdi-restore</v-icon>
        Restablecer
      </v-btn>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PermissionsGrid',
  props: {
    userId: {
      type: [Number, String],
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    initialPermissions: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      permissions: {},
      permissionInfo: {
        modules: {}
      },
      selectedPreset: this.userRole,
      saving: false
    }
  },
  async mounted() {
    await this.loadPermissionInfo();
    this.initializePermissions();
  },
  methods: {
    async loadPermissionInfo() {
      try {
        const response = await fetch(`/api/users/permissions/info/${this.userRole}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          this.permissionInfo = result.data;
        }
      } catch (error) {
        console.error('Error cargando información de permisos:', error);
      }
    },

    initializePermissions() {
      // Usar permisos iniciales o por defecto del rol
      this.permissions = this.initialPermissions || this.permissionInfo.defaults || {};
      
      // Asegurar que todos los módulos existan
      Object.keys(this.permissionInfo.modules || {}).forEach(moduleKey => {
        if (!this.permissions[moduleKey]) {
          this.permissions[moduleKey] = [];
        }
      });
    },

    hasPermission(module, action) {
      return this.permissions[module]?.includes(action) || false;
    },

    togglePermission(module, action, enabled) {
      if (!this.permissions[module]) {
        this.permissions[module] = [];
      }

      const index = this.permissions[module].indexOf(action);
      
      if (enabled && index === -1) {
        this.permissions[module].push(action);
      } else if (!enabled && index !== -1) {
        this.permissions[module].splice(index, 1);
      }

      // Actualizar en tiempo real
      this.$emit('permissions-changed', { ...this.permissions });
    },

    async applyPreset(presetRole) {
      if (!presetRole) return;

      try {
        const response = await fetch(`/api/users/permissions/defaults/${presetRole}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          this.permissions = result.data;
          this.$emit('permissions-changed', { ...this.permissions });
        }
      } catch (error) {
        console.error('Error aplicando preset:', error);
      }
    },

    async savePermissions() {
      this.saving = true;
      
      try {
        const response = await fetch(`/api/users/${this.userId}/permissions`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            permissions: this.permissions
          })
        });

        if (response.ok) {
          this.$emit('permissions-saved', this.permissions);
          // Mostrar notificación de éxito
          this.$emit('show-message', {
            type: 'success',
            message: 'Permisos guardados exitosamente'
          });
        } else {
          throw new Error('Error al guardar permisos');
        }
      } catch (error) {
        console.error('Error guardando permisos:', error);
        this.$emit('show-message', {
          type: 'error',
          message: 'Error al guardar permisos'
        });
      } finally {
        this.saving = false;
      }
    },

    resetPermissions() {
      this.permissions = { ...this.permissionInfo.defaults };
      this.selectedPreset = this.userRole;
      this.$emit('permissions-changed', { ...this.permissions });
    }
  }
}
</script>

<style scoped>
.permissions-grid {
  max-width: 1000px;
}

.module-icon {
  font-size: 1.2em;
  margin-right: 8px;
}

.permission-checkbox {
  transition: all 0.3s ease;
}

.permission-checkbox.permission-granted :deep(.v-selection-control__wrapper) {
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 4px;
  padding: 4px;
}

.permission-checkbox.permission-denied :deep(.v-selection-control__wrapper) {
  background-color: rgba(244, 244, 244, 0.5);
  border-radius: 4px;
  padding: 4px;
}

.permission-checkbox.permission-granted :deep(.v-label) {
  color: #4CAF50 !important;
  font-weight: 500;
}

.permission-checkbox.permission-denied :deep(.v-label) {
  color: #666 !important;
}

.permissions-modules .v-card {
  border-left: 4px solid #2196F3;
}

.v-btn-toggle .v-btn {
  text-transform: none;
}
</style>
