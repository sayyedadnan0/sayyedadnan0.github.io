'use client'

import Modal from '@/components/ui/Modal'
import MediaLibrary, { type MediaAsset } from './MediaLibrary'

export default function MediaPickerDialog({ onClose, onSelect }: { onClose: () => void; onSelect: (asset: MediaAsset) => void }) {
  return <Modal title="Choose an asset from Media Library" onClose={onClose}>
    <MediaLibrary selectable onSelect={onSelect} />
  </Modal>
}
