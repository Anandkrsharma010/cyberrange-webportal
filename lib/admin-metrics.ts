import type { AdminDeployment } from "@/lib/api"

export type DeploymentStatusBuckets = {
  queued: number
  provisioning: number
  running: number
  failed: number
  cleanup_failed: number
  expired: number
  terminating: number
  other: number
}

export function getDeploymentStatusBuckets(
  deployments: AdminDeployment[],
): DeploymentStatusBuckets {
  const buckets: DeploymentStatusBuckets = {
    queued: 0,
    provisioning: 0,
    running: 0,
    failed: 0,
    cleanup_failed: 0,
    expired: 0,
    terminating: 0,
    other: 0,
  }

  for (const deployment of deployments) {
    const status = (deployment.status || "").toLowerCase()
    if (status in buckets) {
      buckets[status as keyof DeploymentStatusBuckets] += 1
    } else {
      buckets.other += 1
    }
  }

  return buckets
}

export function getDeploymentOpsSummary(deployments: AdminDeployment[]) {
  const buckets = getDeploymentStatusBuckets(deployments)
  const queuedOrProvisioning = buckets.queued + buckets.provisioning
  const failedOrCleanupFailed = buckets.failed + buckets.cleanup_failed
  const totalMembers = deployments.reduce(
    (acc, d) => acc + Number(d.participant_count || 0),
    0,
  )

  return {
    buckets,
    total: deployments.length,
    running: buckets.running,
    queuedOrProvisioning,
    failedOrCleanupFailed,
    totalMembers,
  }
}
