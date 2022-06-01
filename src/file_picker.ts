export async function pick(title: string, mode: 'open' | 'save' | 'folder', filters?: [string, string][], suggestion?: string): Promise<string> {
    const fp = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker)
  
    if (suggestion) fp.defaultString = suggestion
  
    mode = {
      open: Components.interfaces.nsIFilePicker.modeOpen,
      save: Components.interfaces.nsIFilePicker.modeSave,
      folder: Components.interfaces.nsIFilePicker.modeGetFolder,
    }[mode]
  
    fp.init(window, title, mode)
  
    for (const [label, ext] of (filters || [])) {
      fp.appendFilter(label, ext)
    }
  
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new Zotero.Promise(resolve => {
      fp.open(userChoice => {
        switch (userChoice) {
          case Components.interfaces.nsIFilePicker.returnOK:
          case Components.interfaces.nsIFilePicker.returnReplace:
            resolve(fp.file.path)
            break
  
          default: // aka returnCancel
            resolve('')
            break
        }
      })
    })
  }