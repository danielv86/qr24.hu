<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type {
  BlogMediaResult,
  BlogPostAdminList,
  BlogPostDetail,
  BlogPostListItem,
  BlogPostStatus,
} from '#shared/types/blog'

definePageMeta({ layout: 'admin' })

useSeoMeta({
  title: 'Blog | Admin',
  robots: 'noindex, nofollow',
})

const { session } = useAdminSession()

const view = ref<'list' | 'edit'>('list')
const posts = ref<BlogPostListItem[]>([])
const counts = ref({ all: 0, published: 0, draft: 0 })
const total = ref(0)
const page = ref(1)
const perPage = 10
const statusFilter = ref<'all' | 'draft' | 'published'>('all')
const search = ref('')
const listLoading = ref(false)
const listError = ref('')
const pendingDelete = ref<number | null>(null)

const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')
const formMessage = ref('')
const coverUploading = ref(false)
const slugTouched = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: '',
  tags: '',
  status: 'draft' as BlogPostStatus,
  publishedAt: '',
})

const statusModel = computed({
  get: () => form.status,
  set: (value: string) => {
    form.status = value === 'published' ? 'published' : 'draft'
  },
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage)))

function slugifyClient(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

watch(
  () => form.title,
  (value) => {
    if (!slugTouched.value) form.slug = slugifyClient(value)
  },
)

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function resetForm() {
  editingId.value = null
  form.title = ''
  form.slug = ''
  form.excerpt = ''
  form.content = ''
  form.coverImage = ''
  form.category = ''
  form.tags = ''
  form.status = 'draft'
  form.publishedAt = ''
  slugTouched.value = false
  formError.value = ''
  formMessage.value = ''
}

async function loadPosts() {
  listLoading.value = true
  listError.value = ''
  try {
    const response = await $fetch<ApiSuccess<BlogPostAdminList>>('/api/admin/blog', {
      query: { page: page.value, perPage, status: statusFilter.value, q: search.value.trim() },
    })
    posts.value = response.data.items
    total.value = response.data.total
    counts.value = response.data.counts
  } catch (error) {
    listError.value = apiErrorMessage(error, 'A bejegyzések betöltése nem sikerült.')
  } finally {
    listLoading.value = false
  }
}

function openCreate() {
  resetForm()
  view.value = 'edit'
}

async function openEdit(post: BlogPostListItem) {
  resetForm()
  view.value = 'edit'
  try {
    const response = await $fetch<ApiSuccess<BlogPostDetail>>(`/api/admin/blog/${post.id}`)
    const data = response.data
    editingId.value = data.id
    form.title = data.title
    form.slug = data.slug
    form.excerpt = data.excerpt
    form.content = data.content
    form.coverImage = data.coverImage ?? ''
    form.category = data.category
    form.tags = data.tags.join(', ')
    form.status = data.status
    form.publishedAt = toLocalInput(data.publishedAt)
    slugTouched.value = true
  } catch (error) {
    formError.value = apiErrorMessage(error, 'A bejegyzés betöltése nem sikerült.')
  }
}

async function savePost() {
  saving.value = true
  formError.value = ''
  formMessage.value = ''
  try {
    const body = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content,
      coverImage: form.coverImage.trim(),
      category: form.category.trim(),
      tags: form.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .slice(0, 10),
      status: form.status,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : '',
    }
    const editing = editingId.value !== null
    const response = await $fetch<ApiSuccess<BlogPostDetail>>(
      editing ? `/api/admin/blog/${editingId.value}` : '/api/admin/blog',
      { method: editing ? 'PATCH' : 'POST', body },
    )
    editingId.value = response.data.id
    form.slug = response.data.slug
    form.excerpt = response.data.excerpt
    formMessage.value =
      response.data.status === 'published'
        ? 'Mentve. A bejegyzés publikálva, azonnal megjelenik a blogon.'
        : 'Mentve piszkozatként. Csak bejelentkezve látható.'
    await loadPosts()
  } catch (error) {
    formError.value = apiErrorMessage(error, 'A mentés nem sikerült.')
  } finally {
    saving.value = false
  }
}

async function removePost(post: BlogPostListItem) {
  if (pendingDelete.value !== post.id) {
    pendingDelete.value = post.id
    return
  }
  pendingDelete.value = null
  listError.value = ''
  try {
    await $fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' })
    if (editingId.value === post.id) {
      resetForm()
      view.value = 'list'
    }
    await loadPosts()
  } catch (error) {
    listError.value = apiErrorMessage(error, 'A törlés nem sikerült.')
  }
}

async function onCoverSelected(event: Event) {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  element.value = ''
  if (!file) return
  coverUploading.value = true
  formError.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const response = await $fetch<ApiSuccess<BlogMediaResult>>('/api/admin/blog/media', {
      method: 'POST',
      body,
    })
    form.coverImage = response.data.url
  } catch (error) {
    formError.value = apiErrorMessage(error, 'A borítókép feltöltése nem sikerült.')
  } finally {
    coverUploading.value = false
  }
}

function applyFilter() {
  page.value = 1
  loadPosts()
}

watch(
  session,
  (value) => {
    if (value) loadPosts()
  },
  { immediate: true },
)

const statusBadge: Record<BlogPostStatus, string> = {
  published: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-900',
  draft: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 ring-amber-200 dark:ring-amber-900',
}
const statusLabel: Record<BlogPostStatus, string> = {
  published: 'Publikálva',
  draft: 'Piszkozat',
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Blog</h1>
        <p class="mt-1 max-w-2xl text-sm text-ink-soft">
          Bejegyzések szerkesztése a TipTap szerkesztővel: címsorok, félkövér, dőlt, aláhúzott, áthúzott, kiemelés,
          szövegszín, igazítás, listák, idézet, kód, táblázat és képfeltöltés.
        </p>
      </div>
      <button v-if="view === 'list'" type="button" class="btn-primary" @click="openCreate">
        <Icon name="lucide:plus" class="h-4 w-4" aria-hidden="true" />
        Új bejegyzés
      </button>
      <button v-else type="button" class="btn-secondary" @click="view = 'list'">
        <Icon name="lucide:arrow-left" class="h-4 w-4" aria-hidden="true" />
        Vissza a listához
      </button>
    </div>

    <!-- LISTA -->
    <div v-if="view === 'list'" class="mt-4">
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex overflow-hidden rounded-lg border border-slate-300 text-xs">
          <button
            v-for="option in (['all', 'published', 'draft'] as const)"
            :key="option"
            type="button"
            :class="[
              'px-3 py-1.5 font-medium',
              statusFilter === option ? 'bg-brand-600 text-white' : 'bg-surface text-ink-soft hover:bg-slate-50',
            ]"
            @click="statusFilter = option; applyFilter()"
          >
            {{ option === 'all' ? `Mind (${counts.all})` : option === 'published' ? `Publikált (${counts.published})` : `Piszkozat (${counts.draft})` }}
          </button>
        </div>
        <form class="flex flex-1 items-center gap-2 sm:max-w-sm" @submit.prevent="applyFilter">
          <input
            v-model="search"
            type="search"
            class="field-input py-1.5 text-sm"
            placeholder="Keresés cím vagy webcím alapján"
            aria-label="Keresés a bejegyzésekben"
          >
          <button type="submit" class="btn-secondary px-3 py-1.5 text-xs">Keresés</button>
        </form>
      </div>

      <p v-if="listError" class="mt-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">{{ listError }}</p>
      <p v-if="listLoading" class="mt-3 text-sm text-ink-muted">Betöltés…</p>
      <p
        v-else-if="!posts.length"
        class="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-ink-muted"
      >
        Még nincs bejegyzés. Kattints az „Új bejegyzés” gombra, és írd meg az elsőt.
      </p>

      <div v-else class="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-surface">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th class="px-3 py-2 font-semibold">Cím</th>
              <th class="hidden px-3 py-2 font-semibold sm:table-cell">Kategória</th>
              <th class="px-3 py-2 font-semibold">Állapot</th>
              <th class="hidden px-3 py-2 font-semibold md:table-cell">Frissítve</th>
              <th class="px-3 py-2 text-right font-semibold">Műveletek</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="post in posts" :key="post.id" class="align-top">
              <td class="px-3 py-2.5">
                <p class="font-medium text-ink">{{ post.title }}</p>
                <p class="mt-0.5 truncate text-xs text-ink-muted">/blog/{{ post.slug }}</p>
              </td>
              <td class="hidden px-3 py-2.5 text-ink-soft sm:table-cell">{{ post.category || '–' }}</td>
              <td class="px-3 py-2.5">
                <span :class="['inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', statusBadge[post.status]]">
                  {{ statusLabel[post.status] }}
                </span>
              </td>
              <td class="hidden px-3 py-2.5 text-xs text-ink-muted md:table-cell">
                {{ new Date(post.updatedAt).toLocaleDateString('hu-HU') }}
              </td>
              <td class="px-3 py-2.5">
                <div class="flex flex-wrap items-center justify-end gap-2 text-xs">
                  <NuxtLink
                    v-if="post.status === 'published'"
                    :to="`/blog/${post.slug}`"
                    target="_blank"
                    class="text-ink-muted hover:text-brand-700"
                    aria-label="Bejegyzés megnyitása"
                  >
                    <Icon name="lucide:external-link" class="h-4 w-4" aria-hidden="true" />
                  </NuxtLink>
                  <button type="button" class="font-semibold text-brand-700 hover:underline" @click="openEdit(post)">
                    Szerkesztés
                  </button>
                  <button
                    type="button"
                    :class="['font-semibold', pendingDelete === post.id ? 'text-red-700 dark:text-red-300' : 'text-ink-muted hover:text-red-700 dark:text-red-300']"
                    @click="removePost(post)"
                  >
                    {{ pendingDelete === post.id ? 'Biztosan?' : 'Törlés' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="mt-3 flex items-center justify-between text-xs text-ink-muted">
        <button type="button" class="btn-secondary px-3 py-1.5" :disabled="page <= 1" @click="page -= 1; loadPosts()">
          Előző
        </button>
        <span>{{ page }} / {{ totalPages }} oldal · {{ total }} bejegyzés</span>
        <button type="button" class="btn-secondary px-3 py-1.5" :disabled="page >= totalPages" @click="page += 1; loadPosts()">
          Következő
        </button>
      </div>
    </div>

    <!-- SZERKESZTŐ -->
    <div v-else class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-3">
        <p v-if="formError" class="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">{{ formError }}</p>
        <p v-if="formMessage" class="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">{{ formMessage }}</p>

        <div class="card p-4">
          <label for="blog-title" class="field-label">Cím</label>
          <input id="blog-title" v-model="form.title" type="text" maxlength="160" class="field-input" placeholder="Így készül egy tökéletes QR-kód">

          <div class="mt-3">
            <label for="blog-slug" class="field-label">Webcím</label>
            <div class="flex items-center gap-1 text-sm text-ink-muted">
              <span class="shrink-0">/blog/</span>
              <input
                id="blog-slug"
                v-model="form.slug"
                type="text"
                maxlength="160"
                class="field-input py-2 text-sm"
                placeholder="igy-keszul-egy-tokeletes-qr-kod"
                @input="slugTouched = true"
              >
            </div>
            <p class="field-help">Üresen a címből készül. Csak kisbetű, szám és kötőjel.</p>
          </div>
        </div>

        <div class="card p-4">
          <label for="blog-content" class="field-label">Tartalom</label>
          <ClientOnly>
            <AdminBlogEditor v-model="form.content" :disabled="saving" />
            <template #fallback>
              <p class="rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-ink-muted">
                A szerkesztő betöltése…
              </p>
            </template>
          </ClientOnly>
        </div>
      </div>

      <aside class="space-y-3">
        <div class="card p-4">
          <h2 class="text-sm font-semibold text-ink">Közzététel</h2>
          <div class="mt-3 space-y-3">
            <div>
              <label for="blog-status" class="field-label">Állapot</label>
              <select id="blog-status" v-model="statusModel" class="field-input py-2 text-sm">
                <option value="draft">Piszkozat</option>
                <option value="published">Publikálva</option>
              </select>
            </div>
            <div>
              <label for="blog-published" class="field-label">Megjelenés</label>
              <input
                id="blog-published"
                v-model="form.publishedAt"
                type="datetime-local"
                class="field-input py-2 text-sm"
                :disabled="form.status !== 'published'"
              >
              <p class="field-help">Üresen a mentés időpontja lesz.</p>
            </div>
            <button type="button" class="btn-primary w-full" :disabled="saving" @click="savePost">
              <Icon
                :name="saving ? 'lucide:loader-circle' : 'lucide:save'"
                :class="['h-4 w-4', { 'animate-spin': saving }]"
                aria-hidden="true"
              />
              {{ saving ? 'Mentés…' : editingId ? 'Módosítások mentése' : 'Bejegyzés mentése' }}
            </button>
            <NuxtLink
              v-if="editingId && form.status === 'published'"
              :to="`/blog/${form.slug}`"
              target="_blank"
              class="block text-center text-xs font-semibold text-brand-700 hover:underline"
            >
              Bejegyzés megnyitása
            </NuxtLink>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="text-sm font-semibold text-ink">Borítókép</h2>
          <div v-if="form.coverImage" class="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <img :src="form.coverImage" alt="" class="aspect-[16/9] w-full object-cover">
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" class="btn-secondary px-3 py-1.5 text-xs" :disabled="coverUploading" @click="coverInput?.click()">
              <Icon
                :name="coverUploading ? 'lucide:loader-circle' : 'lucide:upload'"
                :class="['h-3.5 w-3.5', { 'animate-spin': coverUploading }]"
                aria-hidden="true"
              />
              {{ coverUploading ? 'Feltöltés…' : 'Kép feltöltése' }}
            </button>
            <button v-if="form.coverImage" type="button" class="text-xs font-semibold text-red-700 dark:text-red-300 hover:underline" @click="form.coverImage = ''">
              Eltávolítás
            </button>
          </div>
          <input
            ref="coverInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            class="hidden"
            aria-label="Borítókép kiválasztása"
            @change="onCoverSelected"
          >
          <p class="field-help">PNG, JPG, WebP vagy GIF, legfeljebb 4 MB.</p>
        </div>

        <div class="card p-4">
          <h2 class="text-sm font-semibold text-ink">Bejegyzés adatai</h2>
          <div class="mt-3 space-y-3">
            <div>
              <label for="blog-excerpt" class="field-label">Kivonat</label>
              <textarea
                id="blog-excerpt"
                v-model="form.excerpt"
                rows="3"
                maxlength="320"
                class="field-input text-sm"
                placeholder="Rövid összefoglaló a bloglistához"
              />
              <p class="field-help">Üresen a tartalomból készül.</p>
            </div>
            <div>
              <label for="blog-category" class="field-label">Kategória</label>
              <input id="blog-category" v-model="form.category" type="text" maxlength="60" class="field-input py-2 text-sm" placeholder="Útmutató">
            </div>
            <div>
              <label for="blog-tags" class="field-label">Címkék</label>
              <input id="blog-tags" v-model="form.tags" type="text" maxlength="240" class="field-input py-2 text-sm" placeholder="qr-kód, útmutató, tippek">
              <p class="field-help">Vesszővel elválasztva, legfeljebb 10.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
