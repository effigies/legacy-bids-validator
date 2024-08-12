// Deno runtime tests for tests/data/valid_dataset
import { assert, assertEquals } from '../../deps/asserts.ts'
import { Cell, Row, Table } from '../../deps/cliffy.ts'
import { colors } from '../../deps/fmt.ts'
import { IssueOutput } from '../../types/issues.ts'
import { legacyOutput } from '../../issues/datasetIssues.ts'
import { formatAssertIssue, validatePath } from './common.ts'
import { parseOptions } from '../../setup/options.ts'

const options = await parseOptions(['fake_dataset_arg', ...Deno.args])
options.ignoreNiftiHeaders = true

// Stand in for old validator config that could ignore issues
function useIssue(issue: IssueOutput): boolean {
  return (
    'schema.rules.checks.general.DuplicateFiles' !== issue.files[0].evidence &&
    issue.key !== 'EMPTY_FILE'
  )
}

let header: string[] = ['issue key', 'filename', 'schema path']
header = header.map((x) => colors.magenta(x))

const errors: Row[] = []
function formatBEIssue(issue: IssueOutput, dsPath: string) {
  errors.push(
    Row.from([
      colors.red(issue.key),
      issue.files[0].file.path,
      issue.files[0].evidence,
    ]),
  )
}

Deno.test('validate bids-examples', async (t) => {
  const prefix = 'tests/data/bids-examples'
  const dirEntries = Array.from(Deno.readDirSync(prefix))

  for (const dirEntry of dirEntries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!dirEntry.isDirectory || dirEntry.name.startsWith('.')) {
      continue
    }
    const path = `${prefix}/${dirEntry.name}`

    try {
      if (Deno.statSync(`${path}/.SKIP_VALIDATION`).isFile) {
        continue
      }
    } catch (e) {}
    const { tree, result } = await validatePath(t, path, options)
    const output = legacyOutput(result.issues)
    output.errors = output.errors.filter((x) => useIssue(x))
    await t.step(`${path} has no issues`, () => {
      assertEquals(output.errors.length, 0)
    })
    if (output.errors.length === 0) {
      continue
    }

    errors.push(
      Row.from([
        new Cell(colors.cyan(dirEntry.name)).colSpan(4),
        undefined,
        undefined,
        undefined,
      ]).border(true),
    )
    output.errors.map((x) => formatBEIssue(x, dirEntry.name))
  }
  const table = new Table()
    .header(header)
    .body(errors)
    .border(false)
    .padding(1)
    .indent(2)
    .maxColWidth(40)
    .toString()
  console.log(table)
})
