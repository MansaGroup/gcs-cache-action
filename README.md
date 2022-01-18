![Banner](.github/assets/banner-thin.png)

# Google Cloud Storage Cache Action

![License](https://img.shields.io/github/license/MansaGroup/gcs-cache-action?style=flat-square) ![GitHub Issues](https://img.shields.io/github/issues/mansagroup/gcs-cache-action?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/MansaGroup/gcs-cache-action?style=flat-square)

GitHub already provides an awesome action to cache your workload
to Azure's servers hosted in United States. However, if you are
using self-hosted runners hosted far away from the cache location,
or if you pay external network way more than internal network,
you may want to host your cache elsewhere for better performance
and lower costs.

This action does have the same set of inputs as the `@actions/cache`
action from GitHub, in addition to a new `bucket` input which should
contain your target Google Cloud Storage bucket. **As simple as that.**

## Usage

> workflow.yml

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v0
  with:
    workload_identity_provider: projects/your-project-id/locations/global/workloadIdentityPools/your-identity-pool/providers/your-provider
    service_account: github-ci@your-project.iam.gserviceaccount.com

- name: Cache the node_modules
  id: node-modules-cache
  uses: mansagroup/gcs-cache-action@v2
  with:
    bucket: my-ci-cache
    path: node_modules
    key: node-modules-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      node-modules-${{ runner.os }}-

- name: Install dependencies
  if: steps.node-modules-cache.outputs.cache-hit == 'false'
  run: npm ci
```

## Inputs

This GitHub action can take several inputs to configure its behaviors:

| Name         | Type     | Default | Example                                                               | Description                                                       |
| ------------ | -------- | ------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| bucket       | String   | ø       | `my-ci-cache`                                                         | The name of the Google Cloud Storage bucket to use                |
| path         | String[] | ø       | `node_modules`                                                        | One or more path to store                                         |
| key          | String   | ø       | `node-modules-${{ runner.os }}-${{ hashFiles('package-lock.json') }}` | Key to use as cache name                                          |
| restore-keys | String[] | ø       | `node-modules-${{ runner.os }}-`                                      | Alternative keys to use when looking for the best cache available |

**Note**: the `path` and `restore-keys` inputs can contains multiple value separated by a new line.

## Outputs

This GitHub action will output the following values:

| Name      | Type   | Description                                                          |
| --------- | ------ | -------------------------------------------------------------------- |
| cache-hit | String | A boolean string representing if the cache was successfully restored |

## Examples

### With multiple paths

> workflow.yml

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v0
  with:
    workload_identity_provider: projects/your-project-id/locations/global/workloadIdentityPools/your-identity-pool/providers/your-provider
    service_account: github-ci@your-project.iam.gserviceaccount.com

- name: Cache the node_modules and npm cache
  id: node-modules-cache
  uses: mansagroup/gcs-cache-action@v2
  with:
    bucket: my-ci-cache
    path: |
      node_modules
      ~/.npm
    key: npm-and-node-modules-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-and-node-modules-${{ runner.os }}-
```

## Compression algorithm

When compressing or decompressing the cache archive, the action will
lookup for the best compression algorithm to use. If `zstd` is available,
it will be used instead of `gzip` by default. The compression method
will be added to the object's metadata on the Bucket. Thanks to this,
when decompressing, the correct algorithm will be used.

> Installing `zstd` on Ubuntu is simple as doing a `apt install zstd`.

> Note that if a cache archive was compressed using one algorithm, this
> same algorithm should be installed to decompress it after.

## Terraform

Here is a little snippet allowing you to create your cache bucket with
**[Terraform](https://www.terraform.io/)** _(which you should probably use)_:

```terraform
resource "google_storage_bucket" "ci_cache" {
  name                        = "your-ci-cache"
  location                    = "your-location" # "EUROPE-WEST1"
  uniform_bucket_level_access = true

  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age = 7
    }
  }
}

resource "google_storage_bucket_iam_member" "ci_cache_write_github_ci" {
  bucket = google_storage_bucket.ci_cache.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:github-ci@your-project.iam.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "ci_cache_read_github_ci" {
  bucket = google_storage_bucket.ci_cache.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:github-ci@your-project.iam.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "ci_cache_legacy_write_github_ci" {
  bucket = google_storage_bucket.ci_cache.name
  role   = "roles/storage.legacyBucketWriter"
  member = "serviceAccount:github-ci@your-project.iam.gserviceaccount.com"
}
```

## Q&A

### Could I use this action on multiple repositories with the same bucket?

**Yes you can.** When storing to the bucket, this action will use
the following the following path:

`[repository owner]/[repository name]/[cache key].tar.gz`

## License

This project is [MIT licensed](LICENSE.txt).

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://jeremylvln.fr/"><img src="https://avatars.githubusercontent.com/u/6763873?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jérémy Levilain</b></sub></a><br /><a href="https://github.com/MansaGroup/gcs-cache-action/commits?author=IamBlueSlime" title="Code">💻</a> <a href="https://github.com/MansaGroup/gcs-cache-action/commits?author=IamBlueSlime" title="Documentation">📖</a> <a href="#ideas-IamBlueSlime" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
