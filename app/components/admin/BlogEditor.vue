<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { BlogMediaResult } from '#shared/types/blog'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const stateTick = ref(0)

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    TiptapStarterKit.configure({ link: { openOnClick: false } }),
    TiptapImage.configure({ allowBase64: false, inline: false }),
    TiptapTextAlign.configure({ types: ['heading', 'paragraph'] }),
    TiptapHighlight.configure({ multicolor: true }),
    TiptapPlaceholder.configure({ placeholder: 'Írd ide a bejegyzést…' }),
    TiptapTextStyle,
    TiptapColor,
    TiptapTableKit.configure({ table: { resizable: false } }),
    TiptapSuperscript,
    TiptapSubscript,
  ],
  editorProps: {
    attributes: {
      class: 'blog-content focus:outline-none',
    },
  },
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', instance.getHTML())
  },
  onTransaction: () => {
    stateTick.value += 1
  },
})

// Külső tartalom (például bejegyzés betöltése) beállítása.
watch(
  () => props.modelValue,
  (value) => {
    const instance = editor.value
    if (!instance) return
    if (value !== instance.getHTML()) instance.commands.setContent(value || '', { emitUpdate: false })
  },
)

interface ToolButton {
  key: string
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
  run: () => void
}

const groups = computed<ToolButton[][]>(() => {
  stateTick.value
  const instance = editor.value
  if (!instance) return []
  const run = (callback: () => void) => () => {
    if (props.disabled) return
    callback()
  }
  return [
    [
      {
        key: 'undo',
        icon: 'lucide:undo-2',
        label: 'Visszavonás',
        disabled: !instance.can().undo(),
        run: run(() => instance.chain().focus().undo().run()),
      },
      {
        key: 'redo',
        icon: 'lucide:redo-2',
        label: 'Újra',
        disabled: !instance.can().redo(),
        run: run(() => instance.chain().focus().redo().run()),
      },
    ],
    [
      {
        key: 'h2',
        icon: 'lucide:heading-2',
        label: 'Címsor 2',
        active: instance.isActive('heading', { level: 2 }),
        run: run(() => instance.chain().focus().toggleHeading({ level: 2 }).run()),
      },
      {
        key: 'h3',
        icon: 'lucide:heading-3',
        label: 'Címsor 3',
        active: instance.isActive('heading', { level: 3 }),
        run: run(() => instance.chain().focus().toggleHeading({ level: 3 }).run()),
      },
      {
        key: 'h4',
        icon: 'lucide:heading-4',
        label: 'Címsor 4',
        active: instance.isActive('heading', { level: 4 }),
        run: run(() => instance.chain().focus().toggleHeading({ level: 4 }).run()),
      },
      {
        key: 'paragraph',
        icon: 'lucide:pilcrow',
        label: 'Bekezdés',
        active: instance.isActive('paragraph'),
        run: run(() => instance.chain().focus().setParagraph().run()),
      },
    ],
    [
      {
        key: 'bold',
        icon: 'lucide:bold',
        label: 'Félkövér',
        active: instance.isActive('bold'),
        run: run(() => instance.chain().focus().toggleBold().run()),
      },
      {
        key: 'italic',
        icon: 'lucide:italic',
        label: 'Dőlt',
        active: instance.isActive('italic'),
        run: run(() => instance.chain().focus().toggleItalic().run()),
      },
      {
        key: 'underline',
        icon: 'lucide:underline',
        label: 'Aláhúzott',
        active: instance.isActive('underline'),
        run: run(() => instance.chain().focus().toggleUnderline().run()),
      },
      {
        key: 'strike',
        icon: 'lucide:strikethrough',
        label: 'Áthúzott',
        active: instance.isActive('strike'),
        run: run(() => instance.chain().focus().toggleStrike().run()),
      },
      {
        key: 'code',
        icon: 'lucide:code',
        label: 'Kód',
        active: instance.isActive('code'),
        run: run(() => instance.chain().focus().toggleCode().run()),
      },
      {
        key: 'superscript',
        icon: 'lucide:superscript',
        label: 'Felső index',
        active: instance.isActive('superscript'),
        run: run(() => instance.chain().focus().toggleSuperscript().run()),
      },
      {
        key: 'subscript',
        icon: 'lucide:subscript',
        label: 'Alsó index',
        active: instance.isActive('subscript'),
        run: run(() => instance.chain().focus().toggleSubscript().run()),
      },
    ],
    [
      {
        key: 'bulletList',
        icon: 'lucide:list',
        label: 'Felsorolás',
        active: instance.isActive('bulletList'),
        run: run(() => instance.chain().focus().toggleBulletList().run()),
      },
      {
        key: 'orderedList',
        icon: 'lucide:list-ordered',
        label: 'Számozott lista',
        active: instance.isActive('orderedList'),
        run: run(() => instance.chain().focus().toggleOrderedList().run()),
      },
      {
        key: 'blockquote',
        icon: 'lucide:quote',
        label: 'Idézet',
        active: instance.isActive('blockquote'),
        run: run(() => instance.chain().focus().toggleBlockquote().run()),
      },
      {
        key: 'codeBlock',
        icon: 'lucide:square-code',
        label: 'Kódblokk',
        active: instance.isActive('codeBlock'),
        run: run(() => instance.chain().focus().toggleCodeBlock().run()),
      },
      {
        key: 'horizontalRule',
        icon: 'lucide:minus',
        label: 'Elválasztó',
        run: run(() => instance.chain().focus().setHorizontalRule().run()),
      },
    ],
    [
      {
        key: 'alignLeft',
        icon: 'lucide:align-left',
        label: 'Balra igazítás',
        active: instance.isActive({ textAlign: 'left' }),
        run: run(() => instance.chain().focus().setTextAlign('left').run()),
      },
      {
        key: 'alignCenter',
        icon: 'lucide:align-center',
        label: 'Középre igazítás',
        active: instance.isActive({ textAlign: 'center' }),
        run: run(() => instance.chain().focus().setTextAlign('center').run()),
      },
      {
        key: 'alignRight',
        icon: 'lucide:align-right',
        label: 'Jobbra igazítás',
        active: instance.isActive({ textAlign: 'right' }),
        run: run(() => instance.chain().focus().setTextAlign('right').run()),
      },
      {
        key: 'alignJustify',
        icon: 'lucide:align-justify',
        label: 'Sorkizárt',
        active: instance.isActive({ textAlign: 'justify' }),
        run: run(() => instance.chain().focus().setTextAlign('justify').run()),
      },
    ],
  ]
})

const stats = computed(() => {
  stateTick.value
  const text = editor.value?.getText().trim() ?? ''
  const words = text ? text.split(/\s+/).length : 0
  return { words, characters: text.length }
})

const canTable = computed(() => {
  stateTick.value
  return Boolean(editor.value?.isActive('table'))
})

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

function setColor(value: string) {
  editor.value?.chain().focus().setColor(value).run()
}

function setHighlight(value: string) {
  editor.value?.chain().focus().toggleHighlight({ color: value }).run()
}

function toggleLink() {
  const instance = editor.value
  if (!instance) return
  if (instance.isActive('link')) {
    instance.chain().focus().unsetLink().run()
    return
  }
  const url = window.prompt('Hivatkozás címe', 'https://')
  if (!url) return
  instance.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

async function onImageSelected(event: Event) {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  element.value = ''
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const response = await $fetch<ApiSuccess<BlogMediaResult>>('/api/admin/blog/media', {
      method: 'POST',
      body,
    })
    editor.value?.chain().focus().setImage({ src: response.data.url, alt: response.data.name }).run()
  } catch (error) {
    uploadError.value = apiErrorMessage(error, 'A kép feltöltése nem sikerült.')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-300 bg-surface shadow-sm">
    <div class="flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-1.5">
      <template v-for="(group, index) in groups" :key="index">
        <span v-if="index > 0" class="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
        <button
          v-for="button in group"
          :key="button.key"
          type="button"
          :title="button.label"
          :aria-label="button.label"
          :aria-pressed="button.active ?? undefined"
          :disabled="button.disabled || disabled"
          :class="[
            'grid h-8 w-8 place-items-center rounded-md transition-colors',
            button.active
              ? 'bg-brand-100 text-brand-800'
              : 'text-ink-soft hover:bg-slate-100 hover:text-ink',
            button.disabled || disabled ? 'cursor-not-allowed opacity-40' : '',
          ]"
          @click="button.run()"
        >
          <Icon :name="button.icon" class="h-4 w-4" aria-hidden="true" />
        </button>
      </template>

      <span class="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />

      <label class="flex h-8 items-center gap-1 rounded-md px-1 hover:bg-slate-100" title="Szövegszín">
        <Icon name="lucide:baseline" class="h-4 w-4 text-ink-soft" aria-hidden="true" />
        <input
          type="color"
          class="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
          aria-label="Szövegszín"
          value="#0f172a"
          @input="setColor(($event.target as HTMLInputElement).value)"
        >
      </label>
      <label class="flex h-8 items-center gap-1 rounded-md px-1 hover:bg-slate-100" title="Kiemelés színe">
        <Icon name="lucide:highlighter" class="h-4 w-4 text-ink-soft" aria-hidden="true" />
        <input
          type="color"
          class="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
          aria-label="Kiemelés színe"
          value="#fef08a"
          @input="setHighlight(($event.target as HTMLInputElement).value)"
        >
      </label>
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-md text-ink-soft transition-colors hover:bg-slate-100 hover:text-ink"
        title="Szövegformázás törlése"
        aria-label="Szövegformázás törlése"
        :disabled="disabled"
        @click="editor?.chain().focus().unsetAllMarks().clearNodes().run()"
      >
        <Icon name="lucide:eraser" class="h-4 w-4" aria-hidden="true" />
      </button>

      <span class="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />

      <button
        type="button"
        :class="[
          'grid h-8 w-8 place-items-center rounded-md transition-colors',
          editor?.isActive('link') ? 'bg-brand-100 text-brand-800' : 'text-ink-soft hover:bg-slate-100 hover:text-ink',
        ]"
        title="Hivatkozás"
        aria-label="Hivatkozás"
        :disabled="disabled"
        @click="toggleLink"
      >
        <Icon name="lucide:link-2" class="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-md text-ink-soft transition-colors hover:bg-slate-100 hover:text-ink"
        title="Kép feltöltése"
        aria-label="Kép feltöltése"
        :disabled="disabled || uploading"
        @click="fileInput?.click()"
      >
        <Icon
          :name="uploading ? 'lucide:loader-circle' : 'lucide:image-plus'"
          :class="['h-4 w-4', { 'animate-spin': uploading }]"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        :class="[
          'grid h-8 w-8 place-items-center rounded-md transition-colors',
          canTable ? 'bg-brand-100 text-brand-800' : 'text-ink-soft hover:bg-slate-100 hover:text-ink',
        ]"
        title="Táblázat beszúrása"
        aria-label="Táblázat beszúrása"
        :disabled="disabled"
        @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
      >
        <Icon name="lucide:table" class="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        class="hidden"
        aria-label="Kép kiválasztása"
        @change="onImageSelected"
      >
    </div>

    <div v-if="canTable" class="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/70 px-2 py-1 text-[11px]">
      <button type="button" class="rounded px-2 py-1 hover:bg-surface" @click="editor?.chain().focus().addRowAfter().run()">+ sor</button>
      <button type="button" class="rounded px-2 py-1 hover:bg-surface" @click="editor?.chain().focus().deleteRow().run()">− sor</button>
      <button type="button" class="rounded px-2 py-1 hover:bg-surface" @click="editor?.chain().focus().addColumnAfter().run()">+ oszlop</button>
      <button type="button" class="rounded px-2 py-1 hover:bg-surface" @click="editor?.chain().focus().deleteColumn().run()">− oszlop</button>
      <button type="button" class="rounded px-2 py-1 text-red-700 dark:text-red-300 hover:bg-surface" @click="editor?.chain().focus().deleteTable().run()">Táblázat törlése</button>
    </div>

    <div class="blog-editor">
      <TiptapEditorContent :editor="editor" />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-1.5 text-[11px] text-ink-muted">
      <span>{{ stats.words }} szó · {{ stats.characters }} karakter</span>
      <span v-if="uploadError" class="text-red-700 dark:text-red-300" role="alert">{{ uploadError }}</span>
    </div>
  </div>
</template>
