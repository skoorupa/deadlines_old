const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer')
  const rootPath = path.join('../',"build")
  const outPath = path.join(rootPath, 'release-builds')

  return Promise.resolve({
    appDirectory: path.join(rootPath, 'Deadlines-win32-x64/'),
    authors: 'Adam Skorupski',
    noMsi: true,
    outputDirectory: path.join(outPath, 'windows-installer','64bit'),
    exe: 'deadlines.exe',
    setupExe: 'DeadlinesSetup64-'+process.env.npm_package_version+'.exe',
    setupIcon: "./tray.ico"
  })
}